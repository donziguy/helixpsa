import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { clients, contacts, tickets } from "@/db/schema"
import { and, eq, desc, count } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

// Input validation schemas
const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  industry: z.string().max(100).optional(),
  slaTier: z.enum(['Enterprise', 'Premium', 'Standard']).default('Standard'),
  responseTime: z.string().max(50).default('4 hours'),
})

const updateClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  industry: z.string().max(100).optional(),
  slaTier: z.enum(['Enterprise', 'Premium', 'Standard']).optional(),
  responseTime: z.string().max(50).optional(),
  slaHealth: z.enum(['good', 'warning', 'breach']).optional(),
  isActive: z.boolean().optional(),
})

const createContactSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  isPrimary: z.boolean().default(false),
})

const updateContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  isPrimary: z.boolean().optional(),
})

export const clientsRouter = createTRPCRouter({
  // Get all clients for the organization
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const clientsWithStats = await ctx.db
        .select({
          id: clients.id,
          name: clients.name,
          industry: clients.industry,
          slaTier: clients.slaTier,
          responseTime: clients.responseTime,
          slaHealth: clients.slaHealth,
          onboardDate: clients.onboardDate,
          isActive: clients.isActive,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
        })
        .from(clients)
        .where(eq(clients.organizationId, ctx.organizationId))
        .orderBy(desc(clients.createdAt))

      // Get ticket counts for each client
      const clientsWithTicketCounts = await Promise.all(
        clientsWithStats.map(async (client) => {
          const [openCount, totalCount] = await Promise.all([
            // Open tickets
            ctx.db
              .select({ count: count() })
              .from(tickets)
              .where(and(
                eq(tickets.clientId, client.id),
                eq(tickets.organizationId, ctx.organizationId),
                eq(tickets.status, 'open')
              ))
              .then(rows => rows[0]?.count || 0),
            // Total tickets
            ctx.db
              .select({ count: count() })
              .from(tickets)
              .where(and(
                eq(tickets.clientId, client.id),
                eq(tickets.organizationId, ctx.organizationId)
              ))
              .then(rows => rows[0]?.count || 0),
          ])

          return {
            ...client,
            ticketCounts: {
              open: openCount,
              total: totalCount,
            },
          }
        })
      )

      return clientsWithTicketCounts
    }),

  // Get single client by ID with contacts
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, input.id),
          eq(clients.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        })
      }

      // Get contacts for this client
      const clientContacts = await ctx.db
        .select()
        .from(contacts)
        .where(and(
          eq(contacts.clientId, client.id),
          eq(contacts.organizationId, ctx.organizationId)
        ))
        .orderBy(desc(contacts.isPrimary))

      return {
        ...client,
        contacts: clientContacts,
      }
    }),

  // Create new client
  create: protectedProcedure
    .input(createClientSchema)
    .mutation(async ({ ctx, input }) => {
      const [newClient] = await ctx.db
        .insert(clients)
        .values({
          organizationId: ctx.organizationId,
          name: input.name,
          industry: input.industry,
          slaTier: input.slaTier,
          responseTime: input.responseTime,
        })
        .returning()

      return newClient
    }),

  // Update client
  update: protectedProcedure
    .input(updateClientSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify client belongs to organization
      const existingClient = await ctx.db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, input.id),
          eq(clients.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingClient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        })
      }

      const updateData: any = {}
      if (input.name !== undefined) updateData.name = input.name
      if (input.industry !== undefined) updateData.industry = input.industry
      if (input.slaTier !== undefined) updateData.slaTier = input.slaTier
      if (input.responseTime !== undefined) updateData.responseTime = input.responseTime
      if (input.slaHealth !== undefined) updateData.slaHealth = input.slaHealth
      if (input.isActive !== undefined) updateData.isActive = input.isActive

      const [updatedClient] = await ctx.db
        .update(clients)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, input.id))
        .returning()

      return updatedClient
    }),

  // Delete client
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify client belongs to organization
      const existingClient = await ctx.db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, input.id),
          eq(clients.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingClient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        })
      }

      // Check if client has any tickets
      const ticketCount = await ctx.db
        .select({ count: count() })
        .from(tickets)
        .where(eq(tickets.clientId, input.id))
        .then(rows => rows[0]?.count || 0)

      if (ticketCount > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cannot delete client with existing tickets',
        })
      }

      await ctx.db
        .delete(clients)
        .where(eq(clients.id, input.id))

      return { success: true }
    }),

  // Contact management
  contacts: createTRPCRouter({
    // Create contact for client
    create: protectedProcedure
      .input(createContactSchema)
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

        // If setting as primary, unset other primary contacts for this client
        if (input.isPrimary) {
          await ctx.db
            .update(contacts)
            .set({ isPrimary: false })
            .where(and(
              eq(contacts.clientId, input.clientId),
              eq(contacts.organizationId, ctx.organizationId)
            ))
        }

        const [newContact] = await ctx.db
          .insert(contacts)
          .values({
            organizationId: ctx.organizationId,
            clientId: input.clientId,
            name: input.name,
            email: input.email,
            phone: input.phone,
            title: input.title,
            isPrimary: input.isPrimary,
          })
          .returning()

        return newContact
      }),

    // Update contact
    update: protectedProcedure
      .input(updateContactSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify contact belongs to organization
        const existingContact = await ctx.db
          .select()
          .from(contacts)
          .where(and(
            eq(contacts.id, input.id),
            eq(contacts.organizationId, ctx.organizationId)
          ))
          .then(rows => rows[0])

        if (!existingContact) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Contact not found',
          })
        }

        // If setting as primary, unset other primary contacts for this client
        if (input.isPrimary) {
          await ctx.db
            .update(contacts)
            .set({ isPrimary: false })
            .where(and(
              eq(contacts.clientId, existingContact.clientId),
              eq(contacts.organizationId, ctx.organizationId)
            ))
        }

        const updateData: any = {}
        if (input.name !== undefined) updateData.name = input.name
        if (input.email !== undefined) updateData.email = input.email
        if (input.phone !== undefined) updateData.phone = input.phone
        if (input.title !== undefined) updateData.title = input.title
        if (input.isPrimary !== undefined) updateData.isPrimary = input.isPrimary

        const [updatedContact] = await ctx.db
          .update(contacts)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, input.id))
          .returning()

        return updatedContact
      }),

    // Delete contact
    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        // Verify contact belongs to organization
        const existingContact = await ctx.db
          .select()
          .from(contacts)
          .where(and(
            eq(contacts.id, input.id),
            eq(contacts.organizationId, ctx.organizationId)
          ))
          .then(rows => rows[0])

        if (!existingContact) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Contact not found',
          })
        }

        await ctx.db
          .delete(contacts)
          .where(eq(contacts.id, input.id))

        return { success: true }
      }),
  }),
})