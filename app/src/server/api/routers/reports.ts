import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { tickets, timeEntries, invoices, clients, users } from "@/db/schema"
import { and, eq, desc, count, sum, sql, between, gte, lte } from "drizzle-orm"

// Input validation schemas
const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
})

const ticketVolumeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  groupBy: z.enum(['day', 'week', 'month']).default('week'),
})

const resolutionTimeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  groupBy: z.enum(['priority', 'client', 'assignee']).default('priority'),
})

const revenueSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  groupBy: z.enum(['month', 'quarter', 'client', 'year']).default('month'),
})

export const reportsRouter = createTRPCRouter({
  // Ticket volume over time
  getTicketVolume: protectedProcedure
    .input(ticketVolumeSchema)
    .query(async ({ ctx, input }) => {
      let dateFormat: string
      let timeInterval: string
      
      switch (input.groupBy) {
        case 'day':
          dateFormat = 'YYYY-MM-DD'
          timeInterval = '1 day'
          break
        case 'week':
          dateFormat = 'YYYY-"W"WW'
          timeInterval = '1 week'
          break
        case 'month':
          dateFormat = 'YYYY-MM'
          timeInterval = '1 month'
          break
        default:
          dateFormat = 'YYYY-"W"WW'
          timeInterval = '1 week'
      }

      const volumeData = await ctx.db.execute(sql`
        WITH date_series AS (
          SELECT generate_series(
            ${input.startDate}::date,
            ${input.endDate}::date,
            ${sql.raw(`'${timeInterval}'`)}::interval
          )::date AS period_start
        ),
        formatted_dates AS (
          SELECT 
            period_start,
            to_char(period_start, ${sql.raw(`'${dateFormat}'`)}) AS period_label
          FROM date_series
        ),
        ticket_counts AS (
          SELECT 
            to_char(${tickets.createdAt}::date, ${sql.raw(`'${dateFormat}'`)}) AS period_label,
            COUNT(*) as ticket_count,
            COUNT(CASE WHEN ${tickets.priority} = 'critical' THEN 1 END) as critical_count,
            COUNT(CASE WHEN ${tickets.priority} = 'high' THEN 1 END) as high_count,
            COUNT(CASE WHEN ${tickets.priority} = 'medium' THEN 1 END) as medium_count,
            COUNT(CASE WHEN ${tickets.priority} = 'low' THEN 1 END) as low_count,
            COUNT(CASE WHEN ${tickets.status} = 'resolved' OR ${tickets.status} = 'closed' THEN 1 END) as resolved_count
          FROM ${tickets}
          WHERE ${tickets.organizationId} = ${ctx.organizationId}
            AND ${tickets.createdAt} >= ${input.startDate}
            AND ${tickets.createdAt} <= ${input.endDate}
          GROUP BY to_char(${tickets.createdAt}::date, ${sql.raw(`'${dateFormat}'`)})
        )
        SELECT 
          fd.period_label,
          fd.period_start,
          COALESCE(tc.ticket_count, 0) as total_tickets,
          COALESCE(tc.critical_count, 0) as critical_tickets,
          COALESCE(tc.high_count, 0) as high_tickets,
          COALESCE(tc.medium_count, 0) as medium_tickets,
          COALESCE(tc.low_count, 0) as low_tickets,
          COALESCE(tc.resolved_count, 0) as resolved_tickets
        FROM formatted_dates fd
        LEFT JOIN ticket_counts tc ON fd.period_label = tc.period_label
        ORDER BY fd.period_start
      `)

      return volumeData.rows.map((row: any) => ({
        period: row.period_label,
        date: row.period_start,
        totalTickets: parseInt(row.total_tickets),
        criticalTickets: parseInt(row.critical_tickets),
        highTickets: parseInt(row.high_tickets),
        mediumTickets: parseInt(row.medium_tickets),
        lowTickets: parseInt(row.low_tickets),
        resolvedTickets: parseInt(row.resolved_tickets),
      }))
    }),

  // Average resolution time by category
  getResolutionTime: protectedProcedure
    .input(resolutionTimeSchema)
    .query(async ({ ctx, input }) => {
      const baseQuery = ctx.db
        .select({
          category: input.groupBy === 'priority' 
            ? tickets.priority 
            : input.groupBy === 'client'
            ? sql<string>`COALESCE(${clients.name}, 'Unassigned')`
            : sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Unassigned')`,
          avgResolutionMinutes: sql<number>`AVG(
            CASE 
              WHEN ${tickets.status} IN ('resolved', 'closed') AND ${tickets.resolvedAt} IS NOT NULL
              THEN EXTRACT(EPOCH FROM (${tickets.resolvedAt} - ${tickets.createdAt})) / 60
              ELSE NULL
            END
          )`,
          totalResolved: count(sql`CASE WHEN ${tickets.status} IN ('resolved', 'closed') THEN 1 END`),
          totalTickets: count(),
        })
        .from(tickets)
        .where(and(
          eq(tickets.organizationId, ctx.organizationId),
          between(tickets.createdAt, input.startDate, input.endDate)
        ))

      let query = baseQuery
      
      if (input.groupBy === 'client') {
        query = query.leftJoin(clients, eq(tickets.clientId, clients.id))
      } else if (input.groupBy === 'assignee') {
        query = query.leftJoin(users, eq(tickets.assigneeId, users.id))
      }

      const groupByColumn = input.groupBy === 'priority' 
        ? tickets.priority 
        : input.groupBy === 'client'
        ? sql`COALESCE(${clients.name}, 'Unassigned')`
        : sql`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Unassigned')`

      const results = await query.groupBy(groupByColumn)

      return results.map((row: any) => ({
        category: row.category || 'Unassigned',
        avgResolutionHours: row.avgResolutionMinutes ? Math.round((row.avgResolutionMinutes / 60) * 10) / 10 : null,
        totalResolved: row.totalResolved,
        totalTickets: row.totalTickets,
        resolutionRate: row.totalTickets > 0 ? Math.round((row.totalResolved / row.totalTickets) * 100) : 0,
      }))
    }),

  // Revenue analysis
  getRevenue: protectedProcedure
    .input(revenueSchema)
    .query(async ({ ctx, input }) => {
      let dateFormat: string
      let timeInterval: string
      
      switch (input.groupBy) {
        case 'month':
          dateFormat = 'YYYY-MM'
          timeInterval = '1 month'
          break
        case 'quarter':
          dateFormat = 'YYYY-"Q"Q'
          timeInterval = '3 months'
          break
        case 'year':
          dateFormat = 'YYYY'
          timeInterval = '1 year'
          break
        case 'client':
          // Special case for client breakdown
          const clientRevenue = await ctx.db
            .select({
              clientName: clients.name,
              clientId: clients.id,
              totalRevenue: sql<string>`SUM(CAST(${invoices.total} AS DECIMAL))`,
              invoiceCount: count(),
              avgInvoiceAmount: sql<string>`AVG(CAST(${invoices.total} AS DECIMAL))`,
            })
            .from(invoices)
            .leftJoin(clients, eq(invoices.clientId, clients.id))
            .where(and(
              eq(invoices.organizationId, ctx.organizationId),
              between(invoices.dateIssued, input.startDate, input.endDate),
              eq(invoices.status, 'paid')
            ))
            .groupBy(clients.id, clients.name)
            .orderBy(desc(sql`SUM(CAST(${invoices.total} AS DECIMAL))`))

          return clientRevenue.map(row => ({
            category: row.clientName || 'Unknown Client',
            revenue: parseFloat(row.totalRevenue || '0'),
            invoiceCount: row.invoiceCount,
            avgInvoice: parseFloat(row.avgInvoiceAmount || '0'),
          }))
        default:
          dateFormat = 'YYYY-MM'
          timeInterval = '1 month'
      }

      // Time-based revenue analysis
      const revenueData = await ctx.db.execute(sql`
        WITH date_series AS (
          SELECT generate_series(
            date_trunc(${sql.raw(`'${input.groupBy === 'quarter' ? 'quarter' : input.groupBy}'`)}, ${input.startDate}::date),
            date_trunc(${sql.raw(`'${input.groupBy === 'quarter' ? 'quarter' : input.groupBy}'`)}, ${input.endDate}::date),
            ${sql.raw(`'${timeInterval}'`)}::interval
          )::date AS period_start
        ),
        formatted_dates AS (
          SELECT 
            period_start,
            to_char(period_start, ${sql.raw(`'${dateFormat}'`)}) AS period_label
          FROM date_series
        ),
        revenue_data AS (
          SELECT 
            to_char(date_trunc(${sql.raw(`'${input.groupBy === 'quarter' ? 'quarter' : input.groupBy}'`)}, ${invoices.dateIssued}), ${sql.raw(`'${dateFormat}'`)}) AS period_label,
            SUM(CAST(${invoices.total} AS DECIMAL)) as total_revenue,
            COUNT(*) as invoice_count,
            AVG(CAST(${invoices.total} AS DECIMAL)) as avg_invoice
          FROM ${invoices}
          WHERE ${invoices.organizationId} = ${ctx.organizationId}
            AND ${invoices.dateIssued} >= ${input.startDate}
            AND ${invoices.dateIssued} <= ${input.endDate}
            AND ${invoices.status} = 'paid'
          GROUP BY to_char(date_trunc(${sql.raw(`'${input.groupBy === 'quarter' ? 'quarter' : input.groupBy}'`)}, ${invoices.dateIssued}), ${sql.raw(`'${dateFormat}'`)})
        )
        SELECT 
          fd.period_label,
          fd.period_start,
          COALESCE(rd.total_revenue, 0) as revenue,
          COALESCE(rd.invoice_count, 0) as invoice_count,
          COALESCE(rd.avg_invoice, 0) as avg_invoice
        FROM formatted_dates fd
        LEFT JOIN revenue_data rd ON fd.period_label = rd.period_label
        ORDER BY fd.period_start
      `)

      return revenueData.rows.map((row: any) => ({
        period: row.period_label,
        date: row.period_start,
        revenue: parseFloat(row.revenue || '0'),
        invoiceCount: parseInt(row.invoice_count || '0'),
        avgInvoice: parseFloat(row.avg_invoice || '0'),
      }))
    }),

  // Dashboard summary stats
  getDashboardStats: protectedProcedure
    .input(dateRangeSchema.optional())
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const startDate = input?.startDate || new Date(now.getFullYear(), now.getMonth(), 1) // Start of month
      const endDate = input?.endDate || now

      // Ticket stats
      const ticketStats = await ctx.db
        .select({
          totalTickets: count(),
          openTickets: count(sql`CASE WHEN ${tickets.status} IN ('open', 'in_progress') THEN 1 END`),
          resolvedTickets: count(sql`CASE WHEN ${tickets.status} IN ('resolved', 'closed') THEN 1 END`),
          criticalTickets: count(sql`CASE WHEN ${tickets.priority} = 'critical' AND ${tickets.status} NOT IN ('resolved', 'closed') THEN 1 END`),
        })
        .from(tickets)
        .where(and(
          eq(tickets.organizationId, ctx.organizationId),
          between(tickets.createdAt, startDate, endDate)
        ))
        .then(rows => rows[0])

      // Time tracking stats
      const timeStats = await ctx.db
        .select({
          totalHours: sql<number>`COALESCE(SUM(${timeEntries.duration}), 0) / 60.0`,
          billableHours: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.billable} THEN ${timeEntries.duration} ELSE 0 END), 0) / 60.0`,
          totalEntries: count(),
        })
        .from(timeEntries)
        .where(and(
          eq(timeEntries.organizationId, ctx.organizationId),
          between(timeEntries.startTime, startDate, endDate)
        ))
        .then(rows => rows[0])

      // Revenue stats
      const revenueStats = await ctx.db
        .select({
          totalRevenue: sql<string>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)`,
          paidRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN CAST(${invoices.total} AS DECIMAL) ELSE 0 END), 0)`,
          outstandingRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} IN ('sent', 'overdue') THEN CAST(${invoices.total} AS DECIMAL) ELSE 0 END), 0)`,
          totalInvoices: count(),
        })
        .from(invoices)
        .where(and(
          eq(invoices.organizationId, ctx.organizationId),
          between(invoices.dateIssued, startDate, endDate)
        ))
        .then(rows => rows[0])

      return {
        dateRange: { startDate, endDate },
        tickets: {
          total: ticketStats?.totalTickets || 0,
          open: ticketStats?.openTickets || 0,
          resolved: ticketStats?.resolvedTickets || 0,
          critical: ticketStats?.criticalTickets || 0,
          resolutionRate: ticketStats && ticketStats.totalTickets > 0 
            ? Math.round(((ticketStats.resolvedTickets || 0) / ticketStats.totalTickets) * 100)
            : 0,
        },
        time: {
          totalHours: Math.round((timeStats?.totalHours || 0) * 10) / 10,
          billableHours: Math.round((timeStats?.billableHours || 0) * 10) / 10,
          billableRate: timeStats && timeStats.totalHours > 0 
            ? Math.round(((timeStats.billableHours || 0) / timeStats.totalHours) * 100)
            : 0,
          totalEntries: timeStats?.totalEntries || 0,
        },
        revenue: {
          total: parseFloat(revenueStats?.totalRevenue || '0'),
          paid: parseFloat(revenueStats?.paidRevenue || '0'),
          outstanding: parseFloat(revenueStats?.outstandingRevenue || '0'),
          totalInvoices: revenueStats?.totalInvoices || 0,
        },
      }
    }),

  // Top clients by metrics
  getTopClients: protectedProcedure
    .input(dateRangeSchema.optional())
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const startDate = input?.startDate || new Date(now.getFullYear(), 0, 1) // Start of year
      const endDate = input?.endDate || now

      const topClients = await ctx.db
        .select({
          clientId: clients.id,
          clientName: clients.name,
          ticketCount: count(tickets.id),
          totalRevenue: sql<string>`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)`,
          totalHours: sql<number>`COALESCE(SUM(${timeEntries.duration}), 0) / 60.0`,
          avgTicketResolutionMinutes: sql<number>`AVG(
            CASE 
              WHEN ${tickets.status} IN ('resolved', 'closed') AND ${tickets.resolvedAt} IS NOT NULL
              THEN EXTRACT(EPOCH FROM (${tickets.resolvedAt} - ${tickets.createdAt})) / 60
              ELSE NULL
            END
          )`,
        })
        .from(clients)
        .leftJoin(tickets, eq(tickets.clientId, clients.id))
        .leftJoin(invoices, eq(invoices.clientId, clients.id))
        .leftJoin(timeEntries, eq(timeEntries.ticketId, tickets.id))
        .where(and(
          eq(clients.organizationId, ctx.organizationId),
          // Only count tickets, invoices, and time entries in date range
          tickets.id ? between(tickets.createdAt, startDate, endDate) : sql`true`,
          invoices.id ? between(invoices.dateIssued, startDate, endDate) : sql`true`,
          timeEntries.id ? between(timeEntries.startTime, startDate, endDate) : sql`true`
        ))
        .groupBy(clients.id, clients.name)
        .orderBy(desc(sql`COALESCE(SUM(CAST(${invoices.total} AS DECIMAL)), 0)`))
        .limit(10)

      return topClients.map(client => ({
        id: client.clientId,
        name: client.clientName,
        ticketCount: client.ticketCount,
        revenue: parseFloat(client.totalRevenue || '0'),
        totalHours: Math.round((client.totalHours || 0) * 10) / 10,
        avgResolutionHours: client.avgTicketResolutionMinutes 
          ? Math.round((client.avgTicketResolutionMinutes / 60) * 10) / 10 
          : null,
      }))
    }),
})