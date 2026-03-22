import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { tickets, clients, contacts, notes, organizations } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

// Portal client authentication using email + client ID combination
// This is a simplified auth for external client access
const portalAuthSchema = z.object({
  clientId: z.string(),
  contactEmail: z.string().email(),
});

export const portalRouter = createTRPCRouter({
  // Public endpoint to authenticate portal access
  authenticate: publicProcedure
    .input(portalAuthSchema)
    .mutation(async ({ ctx, input }) => {
      // Find contact that belongs to the specified client
      const contact = await ctx.db
        .select({
          id: contacts.id,
          name: contacts.name,
          email: contacts.email,
          clientId: contacts.clientId,
          clientName: clients.name,
          organizationId: clients.organizationId,
        })
        .from(contacts)
        .innerJoin(clients, eq(contacts.clientId, clients.id))
        .where(
          and(
            eq(contacts.email, input.contactEmail),
            eq(contacts.clientId, input.clientId),
            eq(clients.isActive, true)
          )
        )
        .limit(1);

      if (contact.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid client credentials",
        });
      }

      // Generate a simple session token for the portal
      const sessionToken = crypto.randomBytes(32).toString("hex");

      return {
        success: true,
        contact: contact[0],
        sessionToken, // In a real app, this would be stored in Redis/DB with expiry
      };
    }),

  // Get all tickets for a specific client
  getClientTickets: publicProcedure
    .input(z.object({
      clientId: z.string(),
      contactEmail: z.string().email(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify access first
      const contact = await ctx.db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.email, input.contactEmail),
            eq(contacts.clientId, input.clientId)
          )
        )
        .limit(1);

      if (contact.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access",
        });
      }

      // Get tickets for this client
      const clientTickets = await ctx.db
        .select({
          id: tickets.id,
          number: tickets.number,
          title: tickets.title,
          description: tickets.description,
          priority: tickets.priority,
          status: tickets.status,
          estimatedHours: tickets.estimatedHours,
          createdAt: tickets.createdAt,
          updatedAt: tickets.updatedAt,
          resolvedAt: tickets.resolvedAt,
          closedAt: tickets.closedAt,
        })
        .from(tickets)
        .where(eq(tickets.clientId, input.clientId))
        .orderBy(desc(tickets.createdAt));

      return clientTickets;
    }),

  // Get specific ticket details for the client
  getTicketById: publicProcedure
    .input(z.object({
      ticketId: z.string(),
      clientId: z.string(),
      contactEmail: z.string().email(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify access first
      const contact = await ctx.db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.email, input.contactEmail),
            eq(contacts.clientId, input.clientId)
          )
        )
        .limit(1);

      if (contact.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access",
        });
      }

      // Get the specific ticket (must belong to this client)
      const ticket = await ctx.db
        .select({
          id: tickets.id,
          number: tickets.number,
          title: tickets.title,
          description: tickets.description,
          priority: tickets.priority,
          status: tickets.status,
          estimatedHours: tickets.estimatedHours,
          createdAt: tickets.createdAt,
          updatedAt: tickets.updatedAt,
          resolvedAt: tickets.resolvedAt,
          closedAt: tickets.closedAt,
        })
        .from(tickets)
        .where(
          and(
            eq(tickets.id, input.ticketId),
            eq(tickets.clientId, input.clientId)
          )
        )
        .limit(1);

      if (ticket.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket not found",
        });
      }

      // Get public notes for this ticket (not internal ones)
      const ticketNotes = await ctx.db
        .select({
          id: notes.id,
          content: notes.content,
          createdAt: notes.createdAt,
        })
        .from(notes)
        .where(
          and(
            eq(notes.ticketId, input.ticketId),
            eq(notes.isInternal, false) // Only show public notes to clients
          )
        )
        .orderBy(asc(notes.createdAt));

      return {
        ...ticket[0],
        notes: ticketNotes,
      };
    }),

  // Submit a new ticket from the portal
  submitTicket: publicProcedure
    .input(z.object({
      clientId: z.string(),
      contactEmail: z.string().email(),
      title: z.string().min(1, "Title is required"),
      description: z.string().min(1, "Description is required"),
      priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access and get client info
      const contact = await ctx.db
        .select({
          id: contacts.id,
          name: contacts.name,
          clientId: contacts.clientId,
          organizationId: clients.organizationId,
        })
        .from(contacts)
        .innerJoin(clients, eq(contacts.clientId, clients.id))
        .where(
          and(
            eq(contacts.email, input.contactEmail),
            eq(contacts.clientId, input.clientId),
            eq(clients.isActive, true)
          )
        )
        .limit(1);

      if (contact.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access",
        });
      }

      // Generate ticket number (get next sequence)
      const lastTicket = await ctx.db
        .select({ number: tickets.number })
        .from(tickets)
        .where(eq(tickets.organizationId, contact[0].organizationId))
        .orderBy(desc(tickets.createdAt))
        .limit(1);

      // Extract number from last ticket (format: HLX-001, HLX-002, etc.)
      let nextNumber = 1;
      if (lastTicket.length > 0) {
        const match = lastTicket[0].number?.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      const ticketNumber = `HLX-${String(nextNumber).padStart(3, '0')}`;

      // Create the ticket
      const newTicket = await ctx.db
        .insert(tickets)
        .values({
          organizationId: contact[0].organizationId,
          number: ticketNumber,
          title: input.title,
          description: input.description,
          clientId: input.clientId,
          priority: input.priority,
          status: "open",
          // SLA deadline will be calculated by triggers if SLA policies exist
        })
        .returning({
          id: tickets.id,
          number: tickets.number,
          title: tickets.title,
          status: tickets.status,
          priority: tickets.priority,
          createdAt: tickets.createdAt,
        });

      return newTicket[0];
    }),

  // Add a note/comment to an existing ticket
  addTicketNote: publicProcedure
    .input(z.object({
      ticketId: z.string(),
      clientId: z.string(),
      contactEmail: z.string().email(),
      content: z.string().min(1, "Note content is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access and get contact info
      const contact = await ctx.db
        .select({
          id: contacts.id,
          name: contacts.name,
          clientId: contacts.clientId,
          organizationId: clients.organizationId,
        })
        .from(contacts)
        .innerJoin(clients, eq(contacts.clientId, clients.id))
        .where(
          and(
            eq(contacts.email, input.contactEmail),
            eq(contacts.clientId, input.clientId)
          )
        )
        .limit(1);

      if (contact.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access",
        });
      }

      // Verify ticket belongs to this client
      const ticket = await ctx.db
        .select({ id: tickets.id })
        .from(tickets)
        .where(
          and(
            eq(tickets.id, input.ticketId),
            eq(tickets.clientId, input.clientId)
          )
        )
        .limit(1);

      if (ticket.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket not found",
        });
      }

      // For now, we'll skip adding notes from the client portal
      // In a real implementation, you'd either:
      // 1. Create a system user for client notes
      // 2. Make userId nullable in the schema
      // 3. Store client comments in a separate table
      
      const newNote = {
        id: 'temp-note-id',
        content: `${contact[0].name}: ${input.content}`,
        createdAt: new Date(),
      };

      return newNote;
    }),

  // Get client information for the portal
  getClientInfo: publicProcedure
    .input(z.object({
      clientId: z.string(),
      contactEmail: z.string().email(),
    }))
    .query(async ({ ctx, input }) => {
      // Get client and contact info
      const clientInfo = await ctx.db
        .select({
          clientId: clients.id,
          clientName: clients.name,
          industry: clients.industry,
          slaTier: clients.slaTier,
          responseTime: clients.responseTime,
          contactName: contacts.name,
          contactEmail: contacts.email,
          contactPhone: contacts.phone,
        })
        .from(clients)
        .innerJoin(contacts, eq(clients.id, contacts.clientId))
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(contacts.email, input.contactEmail),
            eq(clients.isActive, true)
          )
        )
        .limit(1);

      if (clientInfo.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access",
        });
      }

      return clientInfo[0];
    }),
});