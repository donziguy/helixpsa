import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { tickets, clients, users, timeEntries } from "@/db/schema"
import { and, eq, desc, asc, count, sum, isNotNull, sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

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
        conditions.push(eq(tickets.priority, input.priority))
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
        })
        .returning()

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
})