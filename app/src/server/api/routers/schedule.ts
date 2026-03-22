import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { tickets, users, clients, timeEntries } from "@/db/schema"
import { and, eq, desc, sql, gte, lte, isNotNull, or } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

// Input validation schemas
const scheduleFiltersSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  userId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
})

const assignmentUpdateSchema = z.object({
  ticketId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  scheduledDate: z.date().optional(),
})

export const scheduleRouter = createTRPCRouter({
  // Get schedule data for calendar view
  getSchedule: protectedProcedure
    .input(scheduleFiltersSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(tickets.organizationId, ctx.organizationId)]

      // Filter by date range - tickets with scheduled time entries or SLA deadlines
      const dateConditions = or(
        and(
          gte(tickets.slaDeadline, input.startDate),
          lte(tickets.slaDeadline, input.endDate)
        ),
        sql`EXISTS (
          SELECT 1 FROM ${timeEntries} te 
          WHERE te.ticket_id = ${tickets.id} 
          AND te.start_time >= ${input.startDate}
          AND te.start_time <= ${input.endDate}
        )`
      )
      
      if (dateConditions) {
        conditions.push(dateConditions)
      }

      // Filter by assignee
      if (input.userId) {
        conditions.push(eq(tickets.assigneeId, input.userId))
      }

      // Filter by client
      if (input.clientId) {
        conditions.push(eq(tickets.clientId, input.clientId))
      }

      // Get tickets with their scheduled time entries
      const scheduleItems = await ctx.db
        .select({
          ticket: {
            id: tickets.id,
            number: tickets.number,
            title: tickets.title,
            description: tickets.description,
            priority: tickets.priority,
            status: tickets.status,
            slaDeadline: tickets.slaDeadline,
            estimatedHours: tickets.estimatedHours,
            createdAt: tickets.createdAt,
          },
          assignee: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role,
          },
          client: {
            id: clients.id,
            name: clients.name,
            slaTier: clients.slaTier,
            slaHealth: clients.slaHealth,
          },
        })
        .from(tickets)
        .leftJoin(users, eq(tickets.assigneeId, users.id))
        .leftJoin(clients, eq(tickets.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(tickets.slaDeadline, tickets.priority)

      // Get time entries for these tickets in the date range
      const ticketIds = scheduleItems.map(item => item.ticket.id)
      
      const timeEntriesData = ticketIds.length > 0 ? await ctx.db
        .select({
          id: timeEntries.id,
          ticketId: timeEntries.ticketId,
          userId: timeEntries.userId,
          description: timeEntries.description,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          duration: timeEntries.duration,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(timeEntries)
        .leftJoin(users, eq(timeEntries.userId, users.id))
        .where(and(
          eq(timeEntries.organizationId, ctx.organizationId),
          sql`${timeEntries.ticketId} = ANY(${ticketIds})`,
          gte(timeEntries.startTime, input.startDate),
          lte(timeEntries.startTime, input.endDate)
        ))
        .orderBy(timeEntries.startTime) : []

      // Group time entries by ticket
      const timeEntriesByTicket = timeEntriesData.reduce((acc, entry) => {
        if (!acc[entry.ticketId]) {
          acc[entry.ticketId] = []
        }
        acc[entry.ticketId].push(entry)
        return acc
      }, {} as Record<string, typeof timeEntriesData>)

      // Combine data for calendar format
      const calendarEvents = []

      // Add SLA deadline events
      for (const item of scheduleItems) {
        if (item.ticket.slaDeadline) {
          calendarEvents.push({
            id: `sla-${item.ticket.id}`,
            type: 'sla_deadline' as const,
            title: `SLA: ${item.ticket.number} - ${item.ticket.title}`,
            description: `SLA deadline for ${item.ticket.number}`,
            start: item.ticket.slaDeadline,
            end: item.ticket.slaDeadline,
            ticket: item.ticket,
            assignee: item.assignee,
            client: item.client,
            priority: item.ticket.priority,
            status: item.ticket.status,
          })
        }
      }

      // Add time entry events
      for (const entry of timeEntriesData) {
        const ticket = scheduleItems.find(item => item.ticket.id === entry.ticketId)
        if (ticket) {
          calendarEvents.push({
            id: `time-${entry.id}`,
            type: 'time_entry' as const,
            title: `${ticket.ticket.number}: ${entry.description}`,
            description: entry.description,
            start: entry.startTime,
            end: entry.endTime || new Date(entry.startTime.getTime() + (entry.duration || 30) * 60000),
            ticket: ticket.ticket,
            assignee: entry.user || ticket.assignee,
            client: ticket.client,
            priority: ticket.ticket.priority,
            status: ticket.ticket.status,
            timeEntryId: entry.id,
            duration: entry.duration,
          })
        }
      }

      return {
        events: calendarEvents,
        tickets: scheduleItems,
        timeEntries: timeEntriesByTicket,
      }
    }),

  // Get all technicians for assignment
  getTechnicians: protectedProcedure
    .query(async ({ ctx }) => {
      const technicians = await ctx.db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          hourlyRate: users.hourlyRate,
          isActive: users.isActive,
        })
        .from(users)
        .where(and(
          eq(users.organizationId, ctx.organizationId),
          eq(users.isActive, true)
        ))
        .orderBy(users.firstName, users.lastName)

      return technicians
    }),

  // Update ticket assignment
  updateAssignment: protectedProcedure
    .input(assignmentUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ticket belongs to organization
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
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        })
      }

      // Verify assignee belongs to organization if provided
      if (input.assigneeId) {
        const assignee = await ctx.db
          .select()
          .from(users)
          .where(and(
            eq(users.id, input.assigneeId),
            eq(users.organizationId, ctx.organizationId),
            eq(users.isActive, true)
          ))
          .then(rows => rows[0])

        if (!assignee) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Assignee not found or inactive',
          })
        }
      }

      const updateData: any = {}
      if (input.assigneeId !== undefined) {
        updateData.assigneeId = input.assigneeId
      }
      updateData.updatedAt = new Date()

      const [updatedTicket] = await ctx.db
        .update(tickets)
        .set(updateData)
        .where(eq(tickets.id, input.ticketId))
        .returning()

      return updatedTicket
    }),

  // Get workload summary by technician
  getWorkloadSummary: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      // Get all active technicians
      const technicians = await ctx.db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(and(
          eq(users.organizationId, ctx.organizationId),
          eq(users.isActive, true)
        ))

      // Get workload data for each technician
      const workloadData = await Promise.all(
        technicians.map(async (tech) => {
          // Count assigned tickets
          const assignedTickets = await ctx.db
            .select({
              count: sql<number>`COUNT(*)`,
              openCount: sql<number>`COUNT(CASE WHEN ${tickets.status} IN ('open', 'in_progress') THEN 1 END)`,
            })
            .from(tickets)
            .where(and(
              eq(tickets.organizationId, ctx.organizationId),
              eq(tickets.assigneeId, tech.id)
            ))
            .then(rows => rows[0])

          // Get time logged in the period
          const timeLogged = await ctx.db
            .select({
              totalMinutes: sql<number>`COALESCE(SUM(${timeEntries.duration}), 0)`,
              entryCount: sql<number>`COUNT(*)`,
            })
            .from(timeEntries)
            .where(and(
              eq(timeEntries.organizationId, ctx.organizationId),
              eq(timeEntries.userId, tech.id),
              gte(timeEntries.startTime, input.startDate),
              lte(timeEntries.startTime, input.endDate),
              isNotNull(timeEntries.duration)
            ))
            .then(rows => rows[0])

          // Count upcoming SLA deadlines
          const upcomingDeadlines = await ctx.db
            .select({
              count: sql<number>`COUNT(*)`,
            })
            .from(tickets)
            .where(and(
              eq(tickets.organizationId, ctx.organizationId),
              eq(tickets.assigneeId, tech.id),
              sql`${tickets.status} IN ('open', 'in_progress')`,
              gte(tickets.slaDeadline, new Date()),
              lte(tickets.slaDeadline, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // Next 7 days
            ))
            .then(rows => rows[0])

          return {
            technician: tech,
            assignedTickets: Number(assignedTickets?.count) || 0,
            openTickets: Number(assignedTickets?.openCount) || 0,
            hoursLogged: Math.round(((Number(timeLogged?.totalMinutes) || 0) / 60) * 100) / 100,
            timeEntries: Number(timeLogged?.entryCount) || 0,
            upcomingDeadlines: Number(upcomingDeadlines?.count) || 0,
          }
        })
      )

      return workloadData.sort((a, b) => b.openTickets - a.openTickets)
    }),
})