import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { quickbooksIntegrations } from "@/db/schema"
import { and, eq, desc } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { createQuickBooksService } from "@/services/quickbooks-service"
import crypto from "crypto"

// Input validation schemas
const addIntegrationSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
  accessToken: z.string().min(1, "Access token is required"),
  refreshToken: z.string().min(1, "Refresh token is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client secret is required"),
  expiresIn: z.number().min(1, "Token expiration time is required"),
  sandbox: z.boolean().default(true),
})

const syncTimeEntriesSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format (YYYY-MM-DD)"),
  includeDescription: z.boolean().default(false),
})

const updateIntegrationSchema = z.object({
  id: z.string().uuid("Invalid integration ID"),
  isActive: z.boolean().optional(),
  sandbox: z.boolean().optional(),
})

// Encryption helper functions
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const secretKey = process.env.QUICKBOOKS_ENCRYPTION_KEY || 'default-key-please-change-this-in-production';
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const secretKey = process.env.QUICKBOOKS_ENCRYPTION_KEY || 'default-key-please-change-this-in-production';
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipher(algorithm, key);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export const quickbooksRouter = createTRPCRouter({
  // Get QuickBooks integration for current organization
  getIntegration: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'User must belong to an organization' });
      }

      const integration = await ctx.db
        .select({
          id: quickbooksIntegrations.id,
          organizationId: quickbooksIntegrations.organizationId,
          companyId: quickbooksIntegrations.companyId,
          sandbox: quickbooksIntegrations.sandbox,
          isActive: quickbooksIntegrations.isActive,
          lastSyncAt: quickbooksIntegrations.lastSyncAt,
          syncErrors: quickbooksIntegrations.syncErrors,
          tokenExpiresAt: quickbooksIntegrations.tokenExpiresAt,
          createdAt: quickbooksIntegrations.createdAt,
          updatedAt: quickbooksIntegrations.updatedAt,
        })
        .from(quickbooksIntegrations)
        .where(eq(quickbooksIntegrations.organizationId, ctx.user.organizationId))
        .then(rows => rows[0]);

      if (!integration) {
        return null;
      }

      // Don't return sensitive tokens
      return {
        ...integration,
        hasValidTokens: integration.tokenExpiresAt > new Date(),
        syncErrors: integration.syncErrors ? JSON.parse(integration.syncErrors) : []
      };
    }),

  // Add QuickBooks integration
  addIntegration: protectedProcedure
    .input(addIntegrationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'User must belong to an organization' });
      }

      // Check if integration already exists
      const existingIntegration = await ctx.db
        .select({ id: quickbooksIntegrations.id })
        .from(quickbooksIntegrations)
        .where(eq(quickbooksIntegrations.organizationId, ctx.user.organizationId))
        .then(rows => rows[0]);

      if (existingIntegration) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'QuickBooks integration already exists for this organization' 
        });
      }

      try {
        // Encrypt sensitive data
        const encryptedAccessToken = encrypt(input.accessToken);
        const encryptedRefreshToken = encrypt(input.refreshToken);
        const encryptedClientSecret = encrypt(input.clientSecret);

        // Calculate token expiration
        const tokenExpiresAt = new Date(Date.now() + (input.expiresIn * 1000));

        const [newIntegration] = await ctx.db
          .insert(quickbooksIntegrations)
          .values({
            organizationId: ctx.user.organizationId,
            companyId: input.companyId,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            clientId: input.clientId,
            clientSecret: encryptedClientSecret,
            tokenExpiresAt,
            sandbox: input.sandbox,
            isActive: true,
          })
          .returning({
            id: quickbooksIntegrations.id,
            companyId: quickbooksIntegrations.companyId,
            sandbox: quickbooksIntegrations.sandbox,
            tokenExpiresAt: quickbooksIntegrations.tokenExpiresAt,
          });

        return newIntegration;
      } catch (error) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: `Failed to add QuickBooks integration: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    }),

  // Test QuickBooks connection
  testConnection: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'User must belong to an organization' });
      }

      const qbService = await createQuickBooksService(ctx.user.organizationId);
      if (!qbService) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'No QuickBooks integration found for this organization' 
        });
      }

      const result = await qbService.testConnection();
      
      if (!result.success) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: `QuickBooks connection test failed: ${result.error}` 
        });
      }

      return {
        success: true,
        companyName: result.companyName
      };
    }),

  // Sync time entries to QuickBooks as an invoice
  syncTimeEntries: protectedProcedure
    .input(syncTimeEntriesSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'User must belong to an organization' });
      }

      const qbService = await createQuickBooksService(ctx.user.organizationId);
      if (!qbService) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'No QuickBooks integration found for this organization' 
        });
      }

      try {
        const result = await qbService.syncTimeEntriesToInvoice({
          clientId: input.clientId,
          startDate: input.startDate,
          endDate: input.endDate,
          includeDescription: input.includeDescription
        });

        // Update last sync time
        await ctx.db
          .update(quickbooksIntegrations)
          .set({ 
            lastSyncAt: new Date(),
            syncErrors: result.success ? null : JSON.stringify([result.error])
          })
          .where(eq(quickbooksIntegrations.organizationId, ctx.user.organizationId));

        if (!result.success) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: `QuickBooks sync failed: ${result.error}` 
          });
        }

        return {
          success: true,
          invoiceId: result.invoiceId,
          invoiceNumber: result.invoiceNumber,
          totalAmount: result.totalAmount,
          itemCount: result.itemCount
        };
      } catch (error) {
        // Log the error
        await ctx.db
          .update(quickbooksIntegrations)
          .set({ 
            syncErrors: JSON.stringify([error instanceof Error ? error.message : 'Unknown sync error'])
          })
          .where(eq(quickbooksIntegrations.organizationId, ctx.user.organizationId));

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    }),

  // Update integration settings
  updateIntegration: protectedProcedure
    .input(updateIntegrationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'User must belong to an organization' });
      }

      const updateData: Record<string, any> = {
        updatedAt: new Date()
      };

      if (input.isActive !== undefined) {
        updateData.isActive = input.isActive;
      }
      if (input.sandbox !== undefined) {
        updateData.sandbox = input.sandbox;
      }

      const [updatedIntegration] = await ctx.db
        .update(quickbooksIntegrations)
        .set(updateData)
        .where(and(
          eq(quickbooksIntegrations.id, input.id),
          eq(quickbooksIntegrations.organizationId, ctx.user.organizationId)
        ))
        .returning({
          id: quickbooksIntegrations.id,
          isActive: quickbooksIntegrations.isActive,
          sandbox: quickbooksIntegrations.sandbox,
          updatedAt: quickbooksIntegrations.updatedAt,
        });

      if (!updatedIntegration) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'QuickBooks integration not found' });
      }

      return updatedIntegration;
    }),

  // Remove QuickBooks integration
  removeIntegration: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.user.organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'User must belong to an organization' });
      }

      const deletedIntegration = await ctx.db
        .delete(quickbooksIntegrations)
        .where(eq(quickbooksIntegrations.organizationId, ctx.user.organizationId))
        .returning({ id: quickbooksIntegrations.id });

      if (deletedIntegration.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No QuickBooks integration found to remove' });
      }

      return { success: true, removedIntegrationId: deletedIntegration[0].id };
    }),
});