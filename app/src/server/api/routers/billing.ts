import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { invoices, invoiceLineItems, timeEntries, clients, users } from "@/db/schema"
import { and, eq, desc, count, sql, between } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

// Input validation schemas
const createInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  timeEntryIds: z.array(z.string().uuid()).min(1, "At least one time entry is required"),
  dateDue: z.date(),
  notes: z.string().optional(),
})

const updateInvoiceSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'void']).optional(),
  dateDue: z.date().optional(),
  datePaid: z.date().optional().nullable(),
  notes: z.string().optional(),
})

const invoiceReportSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  clientId: z.string().uuid().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'void']).optional(),
})

export const billingRouter = createTRPCRouter({
  // Get all invoices with client info and totals
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const invoicesWithClients = await ctx.db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          dateIssued: invoices.dateIssued,
          dateDue: invoices.dateDue,
          datePaid: invoices.datePaid,
          subtotal: invoices.subtotal,
          tax: invoices.tax,
          total: invoices.total,
          notes: invoices.notes,
          createdAt: invoices.createdAt,
          updatedAt: invoices.updatedAt,
          clientName: clients.name,
          clientId: clients.id,
        })
        .from(invoices)
        .leftJoin(clients, eq(clients.id, invoices.clientId))
        .where(eq(invoices.organizationId, ctx.organizationId))
        .orderBy(desc(invoices.dateIssued))

      return invoicesWithClients
    }),

  // Get single invoice by ID with line items
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          dateIssued: invoices.dateIssued,
          dateDue: invoices.dateDue,
          datePaid: invoices.datePaid,
          subtotal: invoices.subtotal,
          tax: invoices.tax,
          total: invoices.total,
          notes: invoices.notes,
          createdAt: invoices.createdAt,
          updatedAt: invoices.updatedAt,
          clientName: clients.name,
          clientId: clients.id,
        })
        .from(invoices)
        .leftJoin(clients, eq(clients.id, invoices.clientId))
        .where(and(
          eq(invoices.id, input.id),
          eq(invoices.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!invoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        })
      }

      // Get line items for this invoice
      const lineItems = await ctx.db
        .select()
        .from(invoiceLineItems)
        .where(and(
          eq(invoiceLineItems.invoiceId, invoice.id),
          eq(invoiceLineItems.organizationId, ctx.organizationId)
        ))

      return {
        ...invoice,
        lineItems,
      }
    }),

  // Get unbilled time entries for a client
  getUnbilledTimeEntries: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get billable time entries that haven't been invoiced yet
      const unbilledEntries = await ctx.db
        .select({
          id: timeEntries.id,
          ticketId: timeEntries.ticketId,
          userId: timeEntries.userId,
          description: timeEntries.description,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          duration: timeEntries.duration,
          hourlyRate: timeEntries.hourlyRate,
          createdAt: timeEntries.createdAt,
          userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        })
        .from(timeEntries)
        .leftJoin(users, eq(users.id, timeEntries.userId))
        .leftJoin(invoiceLineItems, eq(invoiceLineItems.timeEntryId, timeEntries.id))
        .where(and(
          eq(timeEntries.organizationId, ctx.organizationId),
          eq(timeEntries.billable, true),
          sql`${timeEntries.ticketId} IN (
            SELECT id FROM ${sql.raw('"tickets"')} 
            WHERE ${sql.raw('"clientId"')} = ${input.clientId} 
            AND ${sql.raw('"organizationId"')} = ${ctx.organizationId}
          )`,
          sql`${invoiceLineItems.id} IS NULL` // Not already in an invoice
        ))
        .orderBy(desc(timeEntries.startTime))

      return unbilledEntries
    }),

  // Create invoice from time entries
  create: protectedProcedure
    .input(createInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify client belongs to organization
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

      // Get the time entries and verify they're unbilled
      const timeEntriesData = await ctx.db
        .select({
          id: timeEntries.id,
          description: timeEntries.description,
          duration: timeEntries.duration,
          hourlyRate: timeEntries.hourlyRate,
          userId: timeEntries.userId,
        })
        .from(timeEntries)
        .leftJoin(invoiceLineItems, eq(invoiceLineItems.timeEntryId, timeEntries.id))
        .where(and(
          sql`${timeEntries.id} IN (${sql.raw(input.timeEntryIds.map(() => '?').join(', '))})`,
          eq(timeEntries.organizationId, ctx.organizationId),
          eq(timeEntries.billable, true),
          sql`${invoiceLineItems.id} IS NULL` // Not already invoiced
        ))

      if (timeEntriesData.length !== input.timeEntryIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Some time entries are not found, not billable, or already invoiced',
        })
      }

      // Generate invoice number
      const invoiceCount = await ctx.db
        .select({ count: count() })
        .from(invoices)
        .where(eq(invoices.organizationId, ctx.organizationId))
        .then(rows => rows[0]?.count || 0)

      const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, '0')}`

      // Calculate totals
      let subtotal = 0
      const lineItemsData = timeEntriesData.map(entry => {
        const hours = (entry.duration || 0) / 60 // Convert minutes to hours
        const rate = parseFloat(entry.hourlyRate || '0')
        const amount = hours * rate
        subtotal += amount

        return {
          timeEntryId: entry.id,
          description: entry.description,
          quantity: hours,
          rate,
          amount,
        }
      })

      const tax = 0 // No tax calculation for now
      const total = subtotal + tax

      // Create the invoice
      const [newInvoice] = await ctx.db
        .insert(invoices)
        .values({
          organizationId: ctx.organizationId,
          clientId: input.clientId,
          invoiceNumber,
          status: 'draft',
          dateIssued: new Date(),
          dateDue: input.dateDue,
          subtotal: subtotal.toString(),
          tax: tax.toString(),
          total: total.toString(),
          notes: input.notes,
        })
        .returning()

      // Create line items
      const lineItems = await ctx.db
        .insert(invoiceLineItems)
        .values(
          lineItemsData.map(item => ({
            organizationId: ctx.organizationId,
            invoiceId: newInvoice.id,
            timeEntryId: item.timeEntryId,
            description: item.description,
            quantity: item.quantity.toString(),
            rate: item.rate.toString(),
            amount: item.amount.toString(),
          }))
        )
        .returning()

      return {
        ...newInvoice,
        lineItems,
      }
    }),

  // Update invoice
  update: protectedProcedure
    .input(updateInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify invoice belongs to organization
      const existingInvoice = await ctx.db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.id, input.id),
          eq(invoices.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingInvoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        })
      }

      const updateData: any = {}
      if (input.status !== undefined) updateData.status = input.status
      if (input.dateDue !== undefined) updateData.dateDue = input.dateDue
      if (input.datePaid !== undefined) updateData.datePaid = input.datePaid
      if (input.notes !== undefined) updateData.notes = input.notes

      const [updatedInvoice] = await ctx.db
        .update(invoices)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, input.id))
        .returning()

      return updatedInvoice
    }),

  // Delete invoice (only if draft)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify invoice belongs to organization and is draft
      const existingInvoice = await ctx.db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.id, input.id),
          eq(invoices.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingInvoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        })
      }

      if (existingInvoice.status !== 'draft') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Can only delete draft invoices',
        })
      }

      // Delete line items first (foreign key constraint)
      await ctx.db
        .delete(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, input.id))

      // Delete the invoice
      await ctx.db
        .delete(invoices)
        .where(eq(invoices.id, input.id))

      return { success: true }
    }),

  // Get billing statistics
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfYear = new Date(now.getFullYear(), 0, 1)

      // Monthly stats
      const monthlyInvoices = await ctx.db
        .select({
          count: count(),
          total: sql<string>`SUM(CAST(${invoices.total} AS DECIMAL))`,
        })
        .from(invoices)
        .where(and(
          eq(invoices.organizationId, ctx.organizationId),
          between(invoices.dateIssued, startOfMonth, now)
        ))
        .then(rows => rows[0] || { count: 0, total: '0' })

      // Outstanding invoices
      const outstandingInvoices = await ctx.db
        .select({
          count: count(),
          total: sql<string>`SUM(CAST(${invoices.total} AS DECIMAL))`,
        })
        .from(invoices)
        .where(and(
          eq(invoices.organizationId, ctx.organizationId),
          sql`${invoices.status} IN ('sent', 'overdue')`
        ))
        .then(rows => rows[0] || { count: 0, total: '0' })

      // Yearly revenue
      const yearlyRevenue = await ctx.db
        .select({
          total: sql<string>`SUM(CAST(${invoices.total} AS DECIMAL))`,
        })
        .from(invoices)
        .where(and(
          eq(invoices.organizationId, ctx.organizationId),
          eq(invoices.status, 'paid'),
          between(invoices.dateIssued, startOfYear, now)
        ))
        .then(rows => rows[0]?.total || '0')

      // Overdue count
      const overdueCount = await ctx.db
        .select({ count: count() })
        .from(invoices)
        .where(and(
          eq(invoices.organizationId, ctx.organizationId),
          eq(invoices.status, 'overdue')
        ))
        .then(rows => rows[0]?.count || 0)

      return {
        monthlyInvoices: {
          count: monthlyInvoices.count,
          total: parseFloat(monthlyInvoices.total),
        },
        outstanding: {
          count: outstandingInvoices.count,
          total: parseFloat(outstandingInvoices.total),
        },
        yearlyRevenue: parseFloat(yearlyRevenue),
        overdueCount,
      }
    }),

  // Get billing report
  getReport: protectedProcedure
    .input(invoiceReportSchema)
    .query(async ({ ctx, input }) => {
      let whereConditions = [
        eq(invoices.organizationId, ctx.organizationId),
        between(invoices.dateIssued, input.startDate, input.endDate),
      ]

      if (input.clientId) {
        whereConditions.push(eq(invoices.clientId, input.clientId))
      }

      if (input.status) {
        whereConditions.push(eq(invoices.status, input.status))
      }

      const reportData = await ctx.db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          dateIssued: invoices.dateIssued,
          dateDue: invoices.dateDue,
          datePaid: invoices.datePaid,
          total: invoices.total,
          clientName: clients.name,
          clientId: clients.id,
        })
        .from(invoices)
        .leftJoin(clients, eq(clients.id, invoices.clientId))
        .where(and(...whereConditions))
        .orderBy(desc(invoices.dateIssued))

      // Calculate summary
      const summary = {
        totalInvoices: reportData.length,
        totalAmount: reportData.reduce((sum, invoice) => sum + parseFloat(invoice.total), 0),
        paidAmount: reportData
          .filter(invoice => invoice.status === 'paid')
          .reduce((sum, invoice) => sum + parseFloat(invoice.total), 0),
        outstandingAmount: reportData
          .filter(invoice => ['sent', 'overdue'].includes(invoice.status))
          .reduce((sum, invoice) => sum + parseFloat(invoice.total), 0),
      }

      return {
        invoices: reportData,
        summary,
      }
    }),
})