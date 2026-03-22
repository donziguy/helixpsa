import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { slaPolicies, slaAlerts, tickets, clients, users } from "@/db/schema"
import { and, eq, desc, count, sql, isNull, lte, or } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

// Input validation schemas
const createSlaPolicySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  slaTier: z.enum(['Enterprise', 'Premium', 'Standard']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  responseTimeMinutes: z.number().positive("Response time must be positive"),
  resolutionTimeMinutes: z.number().positive("Resolution time must be positive"),
  warningThresholdPercent: z.number().min(1).max(100).default(80),
  escalationTimeMinutes: z.number().positive().optional(),
  businessHoursOnly: z.boolean().default(false),
})

const updateSlaPolicySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  slaTier: z.enum(['Enterprise', 'Premium', 'Standard']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  responseTimeMinutes: z.number().positive().optional(),
  resolutionTimeMinutes: z.number().positive().optional(),
  warningThresholdPercent: z.number().min(1).max(100).optional(),
  escalationTimeMinutes: z.number().positive().optional(),
  businessHoursOnly: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

const acknowledgeAlertSchema = z.object({
  alertId: z.string().uuid(),
})

const filtersSchema = z.object({
  status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
  alertType: z.enum(['breach', 'warning', 'escalation']).optional(),
  ticketId: z.string().uuid().optional(),
})

export const slaRouter = createTRPCRouter({
  // Get all SLA policies for the organization
  policies: createTRPCRouter({
    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        const policies = await ctx.db
          .select()
          .from(slaPolicies)
          .where(eq(slaPolicies.organizationId, ctx.organizationId))
          .orderBy(desc(slaPolicies.createdAt))

        return policies
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const policy = await ctx.db
          .select()
          .from(slaPolicies)
          .where(and(
            eq(slaPolicies.id, input.id),
            eq(slaPolicies.organizationId, ctx.organizationId)
          ))
          .then(rows => rows[0])

        if (!policy) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'SLA policy not found',
          })
        }

        return policy
      }),

    create: protectedProcedure
      .input(createSlaPolicySchema)
      .mutation(async ({ ctx, input }) => {
        // Check for duplicate policy (same tier + priority combination)
        const existingPolicy = await ctx.db
          .select()
          .from(slaPolicies)
          .where(and(
            eq(slaPolicies.organizationId, ctx.organizationId),
            eq(slaPolicies.slaTier, input.slaTier as any),
            eq(slaPolicies.priority, input.priority as any),
            eq(slaPolicies.isActive, true)
          ))
          .then(rows => rows[0])

        if (existingPolicy) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Active SLA policy already exists for ${input.slaTier} tier and ${input.priority} priority`,
          })
        }

        const [newPolicy] = await ctx.db
          .insert(slaPolicies)
          .values({
            organizationId: ctx.organizationId,
            ...input,
          })
          .returning()

        return newPolicy
      }),

    update: protectedProcedure
      .input(updateSlaPolicySchema)
      .mutation(async ({ ctx, input }) => {
        // Verify policy belongs to organization
        const existingPolicy = await ctx.db
          .select()
          .from(slaPolicies)
          .where(and(
            eq(slaPolicies.id, input.id),
            eq(slaPolicies.organizationId, ctx.organizationId)
          ))
          .then(rows => rows[0])

        if (!existingPolicy) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'SLA policy not found',
          })
        }

        // Check for duplicate if changing tier/priority
        if (input.slaTier || input.priority) {
          const tier = input.slaTier || existingPolicy.slaTier
          const priority = input.priority || existingPolicy.priority
          
          const duplicatePolicy = await ctx.db
            .select()
            .from(slaPolicies)
            .where(and(
              eq(slaPolicies.organizationId, ctx.organizationId),
              eq(slaPolicies.slaTier, tier as any),
              eq(slaPolicies.priority, priority as any),
              eq(slaPolicies.isActive, true),
              sql`${slaPolicies.id} != ${input.id}`
            ))
            .then(rows => rows[0])

          if (duplicatePolicy) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: `Active SLA policy already exists for ${tier} tier and ${priority} priority`,
            })
          }
        }

        const updateData: any = { updatedAt: new Date() }
        if (input.name !== undefined) updateData.name = input.name
        if (input.description !== undefined) updateData.description = input.description
        if (input.slaTier !== undefined) updateData.slaTier = input.slaTier
        if (input.priority !== undefined) updateData.priority = input.priority
        if (input.responseTimeMinutes !== undefined) updateData.responseTimeMinutes = input.responseTimeMinutes
        if (input.resolutionTimeMinutes !== undefined) updateData.resolutionTimeMinutes = input.resolutionTimeMinutes
        if (input.warningThresholdPercent !== undefined) updateData.warningThresholdPercent = input.warningThresholdPercent
        if (input.escalationTimeMinutes !== undefined) updateData.escalationTimeMinutes = input.escalationTimeMinutes
        if (input.businessHoursOnly !== undefined) updateData.businessHoursOnly = input.businessHoursOnly
        if (input.isActive !== undefined) updateData.isActive = input.isActive

        const [updatedPolicy] = await ctx.db
          .update(slaPolicies)
          .set(updateData)
          .where(eq(slaPolicies.id, input.id))
          .returning()

        return updatedPolicy
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        // Verify policy belongs to organization
        const existingPolicy = await ctx.db
          .select()
          .from(slaPolicies)
          .where(and(
            eq(slaPolicies.id, input.id),
            eq(slaPolicies.organizationId, ctx.organizationId)
          ))
          .then(rows => rows[0])

        if (!existingPolicy) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'SLA policy not found',
          })
        }

        // Check if policy has active alerts
        const activeAlerts = await ctx.db
          .select({ count: count() })
          .from(slaAlerts)
          .where(and(
            eq(slaAlerts.policyId, input.id),
            eq(slaAlerts.status, 'active')
          ))
          .then(rows => rows[0]?.count || 0)

        if (activeAlerts > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Cannot delete SLA policy with active alerts',
          })
        }

        await ctx.db
          .delete(slaPolicies)
          .where(eq(slaPolicies.id, input.id))

        return { success: true }
      }),
  }),

  // SLA Alerts management
  alerts: createTRPCRouter({
    getAll: protectedProcedure
      .input(filtersSchema)
      .query(async ({ ctx, input }) => {
        const conditions = [eq(slaAlerts.organizationId, ctx.organizationId)]
        
        if (input.status) {
          conditions.push(eq(slaAlerts.status, input.status))
        }
        if (input.alertType) {
          conditions.push(eq(slaAlerts.alertType, input.alertType))
        }
        if (input.ticketId) {
          conditions.push(eq(slaAlerts.ticketId, input.ticketId))
        }

        const alerts = await ctx.db
          .select({
            id: slaAlerts.id,
            alertType: slaAlerts.alertType,
            status: slaAlerts.status,
            message: slaAlerts.message,
            deadlineAt: slaAlerts.deadlineAt,
            acknowledgedAt: slaAlerts.acknowledgedAt,
            resolvedAt: slaAlerts.resolvedAt,
            createdAt: slaAlerts.createdAt,
            ticket: {
              id: tickets.id,
              number: tickets.number,
              title: tickets.title,
              priority: tickets.priority,
              status: tickets.status,
            },
            client: {
              id: clients.id,
              name: clients.name,
              slaTier: clients.slaTier,
            },
            policy: {
              id: slaPolicies.id,
              name: slaPolicies.name,
              responseTimeMinutes: slaPolicies.responseTimeMinutes,
              resolutionTimeMinutes: slaPolicies.resolutionTimeMinutes,
            },
            acknowledgedBy: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
            }
          })
          .from(slaAlerts)
          .leftJoin(tickets, eq(slaAlerts.ticketId, tickets.id))
          .leftJoin(clients, eq(tickets.clientId, clients.id))
          .leftJoin(slaPolicies, eq(slaAlerts.policyId, slaPolicies.id))
          .leftJoin(users, eq(slaAlerts.acknowledgedBy, users.id))
          .where(and(...conditions))
          .orderBy(desc(slaAlerts.createdAt))

        return alerts
      }),

    acknowledge: protectedProcedure
      .input(acknowledgeAlertSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify alert belongs to organization
        const existingAlert = await ctx.db
          .select()
          .from(slaAlerts)
          .where(and(
            eq(slaAlerts.id, input.alertId),
            eq(slaAlerts.organizationId, ctx.organizationId)
          ))
          .then(rows => rows[0])

        if (!existingAlert) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'SLA alert not found',
          })
        }

        if (existingAlert.status !== 'active') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Alert has already been acknowledged or resolved',
          })
        }

        const [updatedAlert] = await ctx.db
          .update(slaAlerts)
          .set({
            status: 'acknowledged',
            acknowledgedBy: ctx.userId,
            acknowledgedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(slaAlerts.id, input.alertId))
          .returning()

        return updatedAlert
      }),

    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        // Get alert counts by status
        const alertCounts = await ctx.db
          .select({
            status: slaAlerts.status,
            count: count(),
          })
          .from(slaAlerts)
          .where(eq(slaAlerts.organizationId, ctx.organizationId))
          .groupBy(slaAlerts.status)

        // Get active breach count
        const activeBreaches = await ctx.db
          .select({ count: count() })
          .from(slaAlerts)
          .where(and(
            eq(slaAlerts.organizationId, ctx.organizationId),
            eq(slaAlerts.alertType, 'breach'),
            eq(slaAlerts.status, 'active')
          ))
          .then(rows => rows[0]?.count || 0)

        // Get tickets approaching SLA deadline (next 2 hours)
        const twoHoursFromNow = new Date()
        twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2)

        const approachingDeadline = await ctx.db
          .select({ count: count() })
          .from(tickets)
          .where(and(
            eq(tickets.organizationId, ctx.organizationId),
            or(eq(tickets.status, 'open'), eq(tickets.status, 'in_progress')),
            sql`${tickets.slaDeadline} <= ${twoHoursFromNow}`,
            sql`${tickets.slaDeadline} > ${new Date()}`
          ))
          .then(rows => rows[0]?.count || 0)

        return {
          alertCounts,
          activeBreaches,
          approachingDeadline,
        }
      }),
  }),

  // Utility functions for SLA calculations
  calculateSlaDeadline: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      priority: z.enum(['critical', 'high', 'medium', 'low']),
      createdAt: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Get client to determine SLA tier
      const client = await ctx.db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, input.clientId),
          eq(clients.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        })
      }

      // Find applicable SLA policy
      const policy = await ctx.db
        .select()
        .from(slaPolicies)
        .where(and(
          eq(slaPolicies.organizationId, ctx.organizationId),
          eq(slaPolicies.slaTier, client.slaTier as any),
          eq(slaPolicies.priority, input.priority as any),
          eq(slaPolicies.isActive, true)
        ))
        .then(rows => rows[0])

      if (!policy) {
        // Return null if no policy exists
        return null
      }

      const startTime = input.createdAt || new Date()
      const responseDeadline = new Date(startTime.getTime() + (policy.responseTimeMinutes * 60 * 1000))
      const resolutionDeadline = new Date(startTime.getTime() + (policy.resolutionTimeMinutes * 60 * 1000))
      
      // For business hours only, we would need additional logic here
      // For now, we'll use simple time addition
      
      return {
        policy,
        responseDeadline,
        resolutionDeadline,
        warningThreshold: new Date(startTime.getTime() + (policy.resolutionTimeMinutes * 60 * 1000 * policy.warningThresholdPercent / 100)),
      }
    }),
})