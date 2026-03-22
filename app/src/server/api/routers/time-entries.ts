import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { timeEntries, tickets, clients, users } from "@/db/schema"
import { and, eq, desc, sum, sql, isNotNull } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { events } from "@/lib/realtime"

// Input validation schemas
const createTimeEntrySchema = z.object({
  ticketId: z.string().uuid(),
  description: z.string().min(1, "Description is required"),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().int().positive().optional(), // minutes
  billable: z.boolean().default(true),
  hourlyRate: z.number().positive().optional(),
})

const updateTimeEntrySchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  duration: z.number().int().positive().optional(),
  billable: z.boolean().optional(),
  hourlyRate: z.number().positive().optional(),
})

const timeEntryFiltersSchema = z.object({
  ticketId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  billable: z.boolean().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

const timeRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  userId: z.string().uuid().optional(),
})

export const timeEntriesRouter = createTRPCRouter({
  // Get all time entries for the organization with filters
  getAll: protectedProcedure
    .input(timeEntryFiltersSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(timeEntries.organizationId, ctx.organizationId)]
      
      // Add filters
      if (input.ticketId) {
        conditions.push(eq(timeEntries.ticketId, input.ticketId))
      }
      if (input.userId) {
        conditions.push(eq(timeEntries.userId, input.userId))
      }
      if (input.billable !== undefined) {
        conditions.push(eq(timeEntries.billable, input.billable))
      }
      if (input.startDate) {
        conditions.push(sql`${timeEntries.createdAt} >= ${input.startDate}`)
      }
      if (input.endDate) {
        conditions.push(sql`${timeEntries.createdAt} <= ${input.endDate}`)
      }

      const results = await ctx.db
        .select({
          id: timeEntries.id,
          description: timeEntries.description,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          duration: timeEntries.duration,
          billable: timeEntries.billable,
          hourlyRate: timeEntries.hourlyRate,
          createdAt: timeEntries.createdAt,
          updatedAt: timeEntries.updatedAt,
          ticket: {
            id: tickets.id,
            number: tickets.number,
            title: tickets.title,
          },
          client: {
            id: clients.id,
            name: clients.name,
          },
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(timeEntries)
        .leftJoin(tickets, eq(timeEntries.ticketId, tickets.id))
        .leftJoin(clients, eq(tickets.clientId, clients.id))
        .leftJoin(users, eq(timeEntries.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(timeEntries.createdAt))

      return results
    }),

  // Get single time entry by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const timeEntry = await ctx.db
        .select({
          id: timeEntries.id,
          description: timeEntries.description,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          duration: timeEntries.duration,
          billable: timeEntries.billable,
          hourlyRate: timeEntries.hourlyRate,
          createdAt: timeEntries.createdAt,
          updatedAt: timeEntries.updatedAt,
          ticket: {
            id: tickets.id,
            number: tickets.number,
            title: tickets.title,
          },
          client: {
            id: clients.id,
            name: clients.name,
          },
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(timeEntries)
        .leftJoin(tickets, eq(timeEntries.ticketId, tickets.id))
        .leftJoin(clients, eq(tickets.clientId, clients.id))
        .leftJoin(users, eq(timeEntries.userId, users.id))
        .where(and(
          eq(timeEntries.id, input.id),
          eq(timeEntries.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!timeEntry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Time entry not found',
        })
      }

      return timeEntry
    }),

  // Create new time entry
  create: protectedProcedure
    .input(createTimeEntrySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ticket belongs to the organization
      const ticket = await ctx.db
        .select()
        .from(tickets)
        .where(and(
          eq(tickets.id, input.ticketId),
          eq(tickets.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!ticket) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ticket not found or does not belong to your organization',
        })
      }

      // Calculate duration if not provided and both times are available
      let duration = input.duration
      if (!duration && input.endTime) {
        const durationMs = input.endTime.getTime() - input.startTime.getTime()
        duration = Math.round(durationMs / (1000 * 60)) // Convert to minutes
      }

      // Get user's default hourly rate if not provided
      let hourlyRate = input.hourlyRate
      if (!hourlyRate) {
        const user = await ctx.db
          .select({ hourlyRate: users.hourlyRate })
          .from(users)
          .where(eq(users.id, ctx.userId))
          .then(rows => rows[0])
        
        if (user?.hourlyRate) {
          hourlyRate = parseFloat(user.hourlyRate)
        }
      }

      const [newTimeEntry] = await ctx.db
        .insert(timeEntries)
        .values({
          organizationId: ctx.organizationId,
          ticketId: input.ticketId,
          userId: ctx.userId,
          description: input.description,
          startTime: input.startTime,
          endTime: input.endTime,
          duration,
          billable: input.billable,
          hourlyRate: hourlyRate?.toString(),
        })
        .returning()

      // Emit real-time event
      await events.emitTimeEntryEvent({
        type: 'time_entry_created',
        data: newTimeEntry
      }, ctx.organizationId)

      return newTimeEntry
    }),

  // Update time entry
  update: protectedProcedure
    .input(updateTimeEntrySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify time entry belongs to organization and user
      const existingTimeEntry = await ctx.db
        .select()
        .from(timeEntries)
        .where(and(
          eq(timeEntries.id, input.id),
          eq(timeEntries.organizationId, ctx.organizationId),
          eq(timeEntries.userId, ctx.userId)
        ))
        .then(rows => rows[0])

      if (!existingTimeEntry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Time entry not found or you do not have permission to edit it',
        })
      }

      const updateData: any = {}
      if (input.description !== undefined) updateData.description = input.description
      if (input.startTime !== undefined) updateData.startTime = input.startTime
      if (input.endTime !== undefined) updateData.endTime = input.endTime
      if (input.duration !== undefined) updateData.duration = input.duration
      if (input.billable !== undefined) updateData.billable = input.billable
      if (input.hourlyRate !== undefined) updateData.hourlyRate = input.hourlyRate.toString()

      // Recalculate duration if times changed
      if (input.startTime !== undefined || input.endTime !== undefined) {
        const startTime = input.startTime || existingTimeEntry.startTime
        const endTime = input.endTime || existingTimeEntry.endTime
        
        if (startTime && endTime && input.duration === undefined) {
          const durationMs = endTime.getTime() - startTime.getTime()
          updateData.duration = Math.round(durationMs / (1000 * 60))
        }
      }

      const [updatedTimeEntry] = await ctx.db
        .update(timeEntries)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, input.id))
        .returning()

      // Emit real-time event
      await events.emitTimeEntryEvent({
        type: 'time_entry_updated',
        data: updatedTimeEntry
      }, ctx.organizationId)

      return updatedTimeEntry
    }),

  // Delete time entry
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify time entry belongs to organization and user
      const existingTimeEntry = await ctx.db
        .select()
        .from(timeEntries)
        .where(and(
          eq(timeEntries.id, input.id),
          eq(timeEntries.organizationId, ctx.organizationId),
          eq(timeEntries.userId, ctx.userId)
        ))
        .then(rows => rows[0])

      if (!existingTimeEntry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Time entry not found or you do not have permission to delete it',
        })
      }

      await ctx.db
        .delete(timeEntries)
        .where(eq(timeEntries.id, input.id))

      // Emit real-time event
      await events.emitTimeEntryEvent({
        type: 'time_entry_deleted',
        data: {
          id: input.id,
          ticketId: existingTimeEntry.ticketId,
          organizationId: ctx.organizationId
        }
      }, ctx.organizationId)

      return { success: true }
    }),

  // Get time summary for a date range
  getSummary: protectedProcedure
    .input(timeRangeSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(timeEntries.organizationId, ctx.organizationId),
        sql`${timeEntries.startTime} >= ${input.startDate}`,
        sql`${timeEntries.startTime} <= ${input.endDate}`,
        isNotNull(timeEntries.duration)
      ]

      if (input.userId) {
        conditions.push(eq(timeEntries.userId, input.userId))
      }

      // Total time logged
      const totalSummary = await ctx.db
        .select({
          totalMinutes: sum(timeEntries.duration),
          billableMinutes: sum(sql`CASE WHEN ${timeEntries.billable} = true THEN ${timeEntries.duration} ELSE 0 END`),
          entryCount: sql<number>`COUNT(*)`,
        })
        .from(timeEntries)
        .where(and(...conditions))
        .then(rows => rows[0])

      // Summary by user
      const userSummary = await ctx.db
        .select({
          userId: timeEntries.userId,
          userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          totalMinutes: sum(timeEntries.duration),
          billableMinutes: sum(sql`CASE WHEN ${timeEntries.billable} = true THEN ${timeEntries.duration} ELSE 0 END`),
          entryCount: sql<number>`COUNT(*)`,
        })
        .from(timeEntries)
        .leftJoin(users, eq(timeEntries.userId, users.id))
        .where(and(...conditions))
        .groupBy(timeEntries.userId, users.firstName, users.lastName)

      // Summary by ticket
      const ticketSummary = await ctx.db
        .select({
          ticketId: timeEntries.ticketId,
          ticketNumber: tickets.number,
          ticketTitle: tickets.title,
          clientName: clients.name,
          totalMinutes: sum(timeEntries.duration),
          billableMinutes: sum(sql`CASE WHEN ${timeEntries.billable} = true THEN ${timeEntries.duration} ELSE 0 END`),
          entryCount: sql<number>`COUNT(*)`,
        })
        .from(timeEntries)
        .leftJoin(tickets, eq(timeEntries.ticketId, tickets.id))
        .leftJoin(clients, eq(tickets.clientId, clients.id))
        .where(and(...conditions))
        .groupBy(timeEntries.ticketId, tickets.number, tickets.title, clients.name)

      return {
        total: {
          totalHours: Math.round(((Number(totalSummary?.totalMinutes) || 0) / 60) * 100) / 100,
          billableHours: Math.round(((Number(totalSummary?.billableMinutes) || 0) / 60) * 100) / 100,
          entryCount: Number(totalSummary?.entryCount) || 0,
        },
        byUser: userSummary.map(user => ({
          userId: user.userId,
          userName: user.userName,
          totalHours: Math.round(((Number(user.totalMinutes) || 0) / 60) * 100) / 100,
          billableHours: Math.round(((Number(user.billableMinutes) || 0) / 60) * 100) / 100,
          entryCount: Number(user.entryCount) || 0,
        })),
        byTicket: ticketSummary.map(ticket => ({
          ticketId: ticket.ticketId,
          ticketNumber: ticket.ticketNumber,
          ticketTitle: ticket.ticketTitle,
          clientName: ticket.clientName,
          totalHours: Math.round(((Number(ticket.totalMinutes) || 0) / 60) * 100) / 100,
          billableHours: Math.round(((Number(ticket.billableMinutes) || 0) / 60) * 100) / 100,
          entryCount: Number(ticket.entryCount) || 0,
        })),
      }
    }),

  // Start a timer (create time entry with no end time)
  startTimer: protectedProcedure
    .input(z.object({
      ticketId: z.string().uuid(),
      description: z.string().min(1, "Description is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Stop any existing running timer for this user
      const runningTimer = await ctx.db
        .select()
        .from(timeEntries)
        .where(and(
          eq(timeEntries.organizationId, ctx.organizationId),
          eq(timeEntries.userId, ctx.userId),
          sql`${timeEntries.endTime} IS NULL`
        ))
        .then(rows => rows[0])

      if (runningTimer) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'You already have a running timer. Stop it first.',
        })
      }

      // Verify ticket belongs to the organization
      const ticket = await ctx.db
        .select()
        .from(tickets)
        .where(and(
          eq(tickets.id, input.ticketId),
          eq(tickets.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!ticket) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ticket not found or does not belong to your organization',
        })
      }

      const startTime = new Date()
      const [newTimer] = await ctx.db
        .insert(timeEntries)
        .values({
          organizationId: ctx.organizationId,
          ticketId: input.ticketId,
          userId: ctx.userId,
          description: input.description,
          startTime,
          billable: true,
        })
        .returning()

      // Emit real-time event
      await events.emitTimerEvent({
        type: 'timer_started',
        data: {
          ticketId: input.ticketId,
          userId: ctx.userId,
          startTime: startTime.toISOString(),
          organizationId: ctx.organizationId
        }
      }, ctx.organizationId)

      return newTimer
    }),

  // Stop a timer (set end time and calculate duration)
  stopTimer: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify this is a running timer for this user
      const runningTimer = await ctx.db
        .select()
        .from(timeEntries)
        .where(and(
          eq(timeEntries.id, input.id),
          eq(timeEntries.organizationId, ctx.organizationId),
          eq(timeEntries.userId, ctx.userId),
          sql`${timeEntries.endTime} IS NULL`
        ))
        .then(rows => rows[0])

      if (!runningTimer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Running timer not found',
        })
      }

      const endTime = new Date()
      const durationMs = endTime.getTime() - runningTimer.startTime.getTime()
      const duration = Math.round(durationMs / (1000 * 60)) // Convert to minutes

      const [stoppedTimer] = await ctx.db
        .update(timeEntries)
        .set({
          endTime,
          duration,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, input.id))
        .returning()

      // Emit real-time events
      await events.emitTimerEvent({
        type: 'timer_stopped',
        data: {
          ticketId: runningTimer.ticketId,
          userId: ctx.userId,
          duration,
          organizationId: ctx.organizationId
        }
      }, ctx.organizationId)

      await events.emitTimeEntryEvent({
        type: 'time_entry_updated',
        data: stoppedTimer
      }, ctx.organizationId)

      return stoppedTimer
    }),

  // Get current running timer for user
  getRunningTimer: protectedProcedure
    .query(async ({ ctx }) => {
      const runningTimer = await ctx.db
        .select({
          id: timeEntries.id,
          description: timeEntries.description,
          startTime: timeEntries.startTime,
          ticketId: timeEntries.ticketId,
          ticketNumber: tickets.number,
          ticketTitle: tickets.title,
          clientName: clients.name,
        })
        .from(timeEntries)
        .leftJoin(tickets, eq(timeEntries.ticketId, tickets.id))
        .leftJoin(clients, eq(tickets.clientId, clients.id))
        .where(and(
          eq(timeEntries.organizationId, ctx.organizationId),
          eq(timeEntries.userId, ctx.userId),
          sql`${timeEntries.endTime} IS NULL`
        ))
        .then(rows => rows[0])

      return runningTimer || null
    }),
})