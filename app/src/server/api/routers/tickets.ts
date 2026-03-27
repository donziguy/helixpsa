import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { tickets, clients, users, timeEntries, slaPolicies, slaAlerts } from "@/db/schema"
import { and, eq, desc, asc, count, sum, isNotNull, sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { events } from "@/lib/realtime"
import { AutomationService } from "@/lib/automation/AutomationService"

// Input validation schemas
const createTicketSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional(),
  clientId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  estimatedHours: z.number().positive().optional(),
})

const updateTicketSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']).optional(),
  estimatedHours: z.number().positive().optional(),
})

const ticketFiltersSchema = z.object({
  clientId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  search: z.string().optional(),
})

// Helper function to calculate SLA deadline and create alerts
async function calculateSlaDeadlineAndCreateAlerts(
  db: any, 
  organizationId: string, 
  client: any, 
  priority: string, 
  ticketId: string,
  createdAt: Date = new Date()
) {
  // Find applicable SLA policy
  const policy = await db
    .select()
    .from(slaPolicies)
    .where(and(
      eq(slaPolicies.organizationId, organizationId),
      eq(slaPolicies.slaTier, client.slaTier as any),
      eq(slaPolicies.priority, priority as any),
      eq(slaPolicies.isActive, true)
    ))
    .then((rows: any[]) => rows[0])

  if (!policy) {
    return null // No SLA policy defined
  }

  // Calculate deadlines
  const resolutionDeadline = new Date(createdAt.getTime() + (policy.resolutionTimeMinutes * 60 * 1000))
  const warningTime = new Date(createdAt.getTime() + (policy.resolutionTimeMinutes * 60 * 1000 * policy.warningThresholdPercent / 100))

  // Create warning alert if we're past the warning threshold
  if (new Date() >= warningTime) {
    await db
      .insert(slaAlerts)
      .values({
        organizationId,
        ticketId,
        policyId: policy.id,
        alertType: 'warning',
        message: `Ticket ${priority} priority is approaching SLA deadline. ${Math.round((policy.resolutionTimeMinutes * (100 - policy.warningThresholdPercent) / 100))} minutes remaining.`,
        deadlineAt: resolutionDeadline,
      })
      .catch(() => {}) // Ignore duplicates
  }

  // Create breach alert if we're past the deadline
  if (new Date() >= resolutionDeadline) {
    await db
      .insert(slaAlerts)
      .values({
        organizationId,
        ticketId,
        policyId: policy.id,
        alertType: 'breach',
        message: `SLA BREACH: ${policy.slaTier} ${priority} ticket has exceeded ${Math.round(policy.resolutionTimeMinutes / 60)}h resolution time.`,
        deadlineAt: resolutionDeadline,
      })
      .catch(() => {}) // Ignore duplicates
  }

  return resolutionDeadline
}

export const ticketsRouter = createTRPCRouter({
  // Get all tickets for the organization with filters
  getAll: protectedProcedure
    .input(ticketFiltersSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(tickets.organizationId, ctx.organizationId)]
      
      // Add filters
      if (input.clientId) {
        conditions.push(eq(tickets.clientId, input.clientId))
      }
      if (input.assigneeId) {
        conditions.push(eq(tickets.assigneeId, input.assigneeId))
      }
      if (input.status) {
        conditions.push(eq(tickets.status, input.status))
      }
      if (input.priority) {
        conditions.push(eq(tickets.priority, input.priority as any))
      }

      let query = ctx.db
        .select({
          id: tickets.id,
          number: tickets.number,
          title: tickets.title,
          description: tickets.description,
          priority: tickets.priority,
          status: tickets.status,
          estimatedHours: tickets.estimatedHours,
          slaDeadline: tickets.slaDeadline,
          createdAt: tickets.createdAt,
          updatedAt: tickets.updatedAt,
          resolvedAt: tickets.resolvedAt,
          closedAt: tickets.closedAt,
          client: {
            id: clients.id,
            name: clients.name,
            slaTier: clients.slaTier,
          },
          assignee: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(tickets)
        .leftJoin(clients, eq(tickets.clientId, clients.id))
        .leftJoin(users, eq(tickets.assigneeId, users.id))
        .where(and(...conditions))
        .orderBy(desc(tickets.createdAt))

      const results = await query

      // Apply text search filter in memory for simplicity
      if (input.search) {
        const searchTerm = input.search.toLowerCase()
        return results.filter(ticket => 
          ticket.title.toLowerCase().includes(searchTerm) ||
          ticket.description?.toLowerCase().includes(searchTerm) ||
          ticket.client?.name.toLowerCase().includes(searchTerm)
        )
      }

      return results
    }),

  // Get single ticket by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const ticket = await ctx.db
        .select({
          id: tickets.id,
          number: tickets.number,
          title: tickets.title,
          description: tickets.description,
          priority: tickets.priority,
          status: tickets.status,
          estimatedHours: tickets.estimatedHours,
          slaDeadline: tickets.slaDeadline,
          createdAt: tickets.createdAt,
          updatedAt: tickets.updatedAt,
          resolvedAt: tickets.resolvedAt,
          closedAt: tickets.closedAt,
          client: {
            id: clients.id,
            name: clients.name,
            slaTier: clients.slaTier,
            slaHealth: clients.slaHealth,
          },
          assignee: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(tickets)
        .leftJoin(clients, eq(tickets.clientId, clients.id))
        .leftJoin(users, eq(tickets.assigneeId, users.id))
        .where(and(
          eq(tickets.id, input.id),
          eq(tickets.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!ticket) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        })
      }

      return ticket
    }),

  // Create new ticket
  create: protectedProcedure
    .input(createTicketSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify client belongs to the organization
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
          code: 'BAD_REQUEST',
          message: 'Client not found or does not belong to your organization',
        })
      }

      // Verify assignee belongs to the organization (if provided)
      if (input.assigneeId) {
        const assignee = await ctx.db
          .select()
          .from(users)
          .where(and(
            eq(users.id, input.assigneeId),
            eq(users.organizationId, ctx.organizationId)
          ))
          .then(rows => rows[0])

        if (!assignee) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Assignee not found or does not belong to your organization',
          })
        }
      }

      // Generate ticket number (simple increment for now)
      const ticketCount = await ctx.db
        .select({ count: count() })
        .from(tickets)
        .where(eq(tickets.organizationId, ctx.organizationId))
        .then(rows => rows[0]?.count || 0)

      const ticketNumber = `PSA-${String(ticketCount + 1).padStart(5, '0')}`

      // Calculate SLA deadline
      const createdAt = new Date()
      const slaDeadline = await calculateSlaDeadlineAndCreateAlerts(
        ctx.db, 
        ctx.organizationId, 
        client, 
        input.priority, 
        '', // We'll update this after creation
        createdAt
      )

      // Create the ticket
      const [newTicket] = await ctx.db
        .insert(tickets)
        .values({
          organizationId: ctx.organizationId,
          number: ticketNumber,
          title: input.title,
          description: input.description,
          clientId: input.clientId,
          assigneeId: input.assigneeId,
          priority: input.priority,
          estimatedHours: input.estimatedHours?.toString(),
          slaDeadline,
          createdAt,
        })
        .returning()

      // Now create SLA alerts with the actual ticket ID
      if (slaDeadline) {
        await calculateSlaDeadlineAndCreateAlerts(
          ctx.db, 
          ctx.organizationId, 
          client, 
          input.priority, 
          newTicket.id,
          createdAt
        )
      }

      // Emit real-time event
      await events.emitTicketEvent({
        type: 'ticket_created',
        data: newTicket
      }, ctx.organizationId)

      // Execute automation rules for new ticket
      try {
        const automationService = new AutomationService(ctx.db)
        await automationService.executeRulesForTicket(
          newTicket.id,
          ctx.organizationId,
          'created'
        )
      } catch (error) {
        // Log automation errors but don't fail ticket creation
        console.warn('Automation rules failed for new ticket:', error)
      }

      return newTicket
    }),

  // Update ticket
  update: protectedProcedure
    .input(updateTicketSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ticket belongs to organization
      const existingTicket = await ctx.db
        .select()
        .from(tickets)
        .where(and(
          eq(tickets.id, input.id),
          eq(tickets.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingTicket) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        })
      }

      // Verify assignee belongs to the organization (if provided)
      if (input.assigneeId) {
        const assignee = await ctx.db
          .select()
          .from(users)
          .where(and(
            eq(users.id, input.assigneeId),
            eq(users.organizationId, ctx.organizationId)
          ))
          .then(rows => rows[0])

        if (!assignee) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Assignee not found or does not belong to your organization',
          })
        }
      }

      const updateData: any = {}
      if (input.title !== undefined) updateData.title = input.title
      if (input.description !== undefined) updateData.description = input.description
      if (input.assigneeId !== undefined) updateData.assigneeId = input.assigneeId
      if (input.priority !== undefined) updateData.priority = input.priority
      if (input.status !== undefined) {
        updateData.status = input.status
        // Set resolved/closed timestamps
        if (input.status === 'resolved' && existingTicket.status !== 'resolved') {
          updateData.resolvedAt = new Date()
        }
        if (input.status === 'closed' && existingTicket.status !== 'closed') {
          updateData.closedAt = new Date()
        }
      }
      if (input.estimatedHours !== undefined) updateData.estimatedHours = input.estimatedHours.toString()

      const [updatedTicket] = await ctx.db
        .update(tickets)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, input.id))
        .returning()

      // Emit real-time events
      await events.emitTicketEvent({
        type: 'ticket_updated',
        data: updatedTicket
      }, ctx.organizationId)

      // Emit specific events for status and assignment changes
      if (input.status && input.status !== existingTicket.status) {
        await events.emitTicketEvent({
          type: 'ticket_status_changed',
          data: {
            ticketId: updatedTicket.id,
            status: updatedTicket.status,
            organizationId: ctx.organizationId
          }
        }, ctx.organizationId)
      }

      if (input.assigneeId !== undefined && input.assigneeId !== existingTicket.assigneeId) {
        await events.emitTicketEvent({
          type: 'ticket_assigned',
          data: {
            ticketId: updatedTicket.id,
            assigneeId: updatedTicket.assigneeId,
            organizationId: ctx.organizationId
          }
        }, ctx.organizationId)
      }

      // Execute automation rules for updated ticket
      try {
        const automationService = new AutomationService(ctx.db)
        await automationService.executeRulesForTicket(
          updatedTicket.id,
          ctx.organizationId,
          input.status && input.status !== existingTicket.status ? 'status_changed' : 'updated'
        )
      } catch (error) {
        // Log automation errors but don't fail ticket update
        console.warn('Automation rules failed for updated ticket:', error)
      }

      return updatedTicket
    }),

  // Delete ticket
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ticket belongs to organization
      const existingTicket = await ctx.db
        .select()
        .from(tickets)
        .where(and(
          eq(tickets.id, input.id),
          eq(tickets.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingTicket) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        })
      }

      await ctx.db
        .delete(tickets)
        .where(eq(tickets.id, input.id))

      // Emit real-time event
      await events.emitTicketEvent({
        type: 'ticket_deleted',
        data: {
          id: input.id,
          organizationId: ctx.organizationId
        }
      }, ctx.organizationId)

      return { success: true }
    }),

  // Get ticket statistics
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Get total ticket counts by status
      const statusCounts = await ctx.db
        .select({
          status: tickets.status,
          count: count(),
        })
        .from(tickets)
        .where(eq(tickets.organizationId, ctx.organizationId))
        .groupBy(tickets.status)

      // Get total time logged today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayTime = await ctx.db
        .select({
          totalMinutes: sum(timeEntries.duration),
        })
        .from(timeEntries)
        .where(and(
          eq(timeEntries.organizationId, ctx.organizationId),
          sql`${timeEntries.createdAt} >= ${today}`,
          sql`${timeEntries.createdAt} < ${tomorrow}`,
          isNotNull(timeEntries.duration)
        ))
        .then(rows => Number(rows[0]?.totalMinutes) || 0)

      return {
        statusCounts,
        todayHours: Math.round((todayTime / 60) * 100) / 100,
      }
    }),

  // Check for SLA breaches and create alerts
  checkSlaBreaches: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Get all open/in-progress tickets with SLA deadlines
      const ticketsWithSla = await ctx.db
        .select({
          id: tickets.id,
          number: tickets.number,
          title: tickets.title,
          priority: tickets.priority,
          slaDeadline: tickets.slaDeadline,
          createdAt: tickets.createdAt,
          client: {
            id: clients.id,
            name: clients.name,
            slaTier: clients.slaTier,
          },
        })
        .from(tickets)
        .leftJoin(clients, eq(tickets.clientId, clients.id))
        .where(and(
          eq(tickets.organizationId, ctx.organizationId),
          sql`${tickets.status} IN ('open', 'in_progress')`,
          isNotNull(tickets.slaDeadline)
        ))

      let alertsCreated = 0
      const now = new Date()

      for (const ticket of ticketsWithSla) {
        if (!ticket.slaDeadline || !ticket.client) continue

        // Find the SLA policy for this ticket
        const policy = await ctx.db
          .select()
          .from(slaPolicies)
          .where(and(
            eq(slaPolicies.organizationId, ctx.organizationId),
            eq(slaPolicies.slaTier, ticket.client.slaTier as any),
            eq(slaPolicies.priority, ticket.priority as any),
            eq(slaPolicies.isActive, true)
          ))
          .then(rows => rows[0])

        if (!policy) continue

        // Check if we already have alerts for this ticket
        const existingAlerts = await ctx.db
          .select()
          .from(slaAlerts)
          .where(and(
            eq(slaAlerts.ticketId, ticket.id),
            eq(slaAlerts.policyId, policy.id)
          ))

        const hasWarning = existingAlerts.some(a => a.alertType === 'warning')
        const hasBreach = existingAlerts.some(a => a.alertType === 'breach')

        // Calculate warning threshold time
        const warningTime = new Date(ticket.createdAt.getTime() + (policy.resolutionTimeMinutes * 60 * 1000 * policy.warningThresholdPercent / 100))

        // Create warning alert if needed
        if (!hasWarning && now >= warningTime && now < ticket.slaDeadline) {
          await ctx.db
            .insert(slaAlerts)
            .values({
              organizationId: ctx.organizationId,
              ticketId: ticket.id,
              policyId: policy.id,
              alertType: 'warning',
              message: `Ticket ${ticket.number} (${ticket.priority} priority) is approaching SLA deadline. Client: ${ticket.client.name}`,
              deadlineAt: ticket.slaDeadline,
            })
            .catch(() => {}) // Ignore duplicates

          alertsCreated++
        }

        // Create breach alert if needed
        if (!hasBreach && now >= ticket.slaDeadline) {
          await ctx.db
            .insert(slaAlerts)
            .values({
              organizationId: ctx.organizationId,
              ticketId: ticket.id,
              policyId: policy.id,
              alertType: 'breach',
              message: `SLA BREACH: Ticket ${ticket.number} has exceeded ${Math.round(policy.resolutionTimeMinutes / 60)}h resolution time. Client: ${ticket.client.name}`,
              deadlineAt: ticket.slaDeadline,
            })
            .catch(() => {}) // Ignore duplicates

          alertsCreated++

          // Update client SLA health to breach
          await ctx.db
            .update(clients)
            .set({ slaHealth: 'breach' })
            .where(eq(clients.id, ticket.client.id))
        }
      }

      return {
        message: `Checked ${ticketsWithSla.length} tickets, created ${alertsCreated} alerts`,
        alertsCreated
      }
    }),
})