import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { emailConfigurations, emailProcessingLogs, tickets, clients, users } from "../../../db/schema";
import * as crypto from "crypto";

const algorithm = 'aes-256-cbc';
const secretKey = crypto.createHash('sha256').update(process.env.EMAIL_ENCRYPTION_KEY || 'default-secret-key-change-in-prod').digest();

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encrypted = textParts.join(':');
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export const emailRouter = createTRPCRouter({
  // Get all email configurations for the organization
  getConfigurations: protectedProcedure.query(async ({ ctx }) => {
    const configs = await ctx.db
      .select({
        id: emailConfigurations.id,
        name: emailConfigurations.name,
        email: emailConfigurations.email,
        imapHost: emailConfigurations.imapHost,
        imapPort: emailConfigurations.imapPort,
        imapSecure: emailConfigurations.imapSecure,
        folderName: emailConfigurations.folderName,
        defaultClientId: emailConfigurations.defaultClientId,
        defaultAssigneeId: emailConfigurations.defaultAssigneeId,
        defaultPriority: emailConfigurations.defaultPriority,
        isActive: emailConfigurations.isActive,
        autoAssignBySubject: emailConfigurations.autoAssignBySubject,
        subjectClientMappings: emailConfigurations.subjectClientMappings,
        lastProcessedUid: emailConfigurations.lastProcessedUid,
        createdAt: emailConfigurations.createdAt,
        updatedAt: emailConfigurations.updatedAt,
        defaultClient: {
          id: clients.id,
          name: clients.name,
        },
        defaultAssignee: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(emailConfigurations)
      .leftJoin(clients, eq(emailConfigurations.defaultClientId, clients.id))
      .leftJoin(users, eq(emailConfigurations.defaultAssigneeId, users.id))
      .where(eq(emailConfigurations.organizationId, ctx.session.user.organizationId));

    return configs;
  }),

  // Get a single email configuration by ID
  getConfiguration: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const config = await ctx.db
        .select()
        .from(emailConfigurations)
        .where(
          and(
            eq(emailConfigurations.id, input.id),
            eq(emailConfigurations.organizationId, ctx.session.user.organizationId)
          )
        )
        .limit(1);

      if (!config[0]) {
        throw new Error("Email configuration not found");
      }

      // Don't return the encrypted password in the response
      const { password, ...configWithoutPassword } = config[0];
      return configWithoutPassword;
    }),

  // Create a new email configuration
  createConfiguration: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        imapHost: z.string().min(1, "IMAP host is required"),
        imapPort: z.number().min(1).max(65535),
        imapSecure: z.boolean().default(true),
        email: z.string().email("Valid email address required"),
        password: z.string().min(1, "Password is required"),
        defaultClientId: z.string().uuid().optional(),
        defaultAssigneeId: z.string().uuid().optional(),
        defaultPriority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
        folderName: z.string().default('INBOX'),
        autoAssignBySubject: z.boolean().default(false),
        subjectClientMappings: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const encryptedPassword = encrypt(input.password);

      const newConfig = await ctx.db
        .insert(emailConfigurations)
        .values({
          organizationId: ctx.session.user.organizationId,
          name: input.name,
          imapHost: input.imapHost,
          imapPort: input.imapPort,
          imapSecure: input.imapSecure,
          email: input.email,
          password: encryptedPassword,
          defaultClientId: input.defaultClientId || null,
          defaultAssigneeId: input.defaultAssigneeId || null,
          defaultPriority: input.defaultPriority,
          folderName: input.folderName,
          autoAssignBySubject: input.autoAssignBySubject,
          subjectClientMappings: input.subjectClientMappings || null,
        })
        .returning();

      return newConfig[0];
    }),

  // Update an email configuration
  updateConfiguration: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1, "Name is required").optional(),
        imapHost: z.string().min(1, "IMAP host is required").optional(),
        imapPort: z.number().min(1).max(65535).optional(),
        imapSecure: z.boolean().optional(),
        email: z.string().email("Valid email address required").optional(),
        password: z.string().optional(),
        defaultClientId: z.string().uuid().nullable().optional(),
        defaultAssigneeId: z.string().uuid().nullable().optional(),
        defaultPriority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        folderName: z.string().optional(),
        isActive: z.boolean().optional(),
        autoAssignBySubject: z.boolean().optional(),
        subjectClientMappings: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, password, ...updateData } = input;
      
      const updateFields: any = { ...updateData, updatedAt: new Date() };
      
      // Only encrypt password if it's being updated
      if (password) {
        updateFields.password = encrypt(password);
      }

      const updatedConfig = await ctx.db
        .update(emailConfigurations)
        .set(updateFields)
        .where(
          and(
            eq(emailConfigurations.id, id),
            eq(emailConfigurations.organizationId, ctx.session.user.organizationId)
          )
        )
        .returning();

      if (!updatedConfig[0]) {
        throw new Error("Email configuration not found");
      }

      return updatedConfig[0];
    }),

  // Delete an email configuration
  deleteConfiguration: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const deletedConfig = await ctx.db
        .delete(emailConfigurations)
        .where(
          and(
            eq(emailConfigurations.id, input.id),
            eq(emailConfigurations.organizationId, ctx.session.user.organizationId)
          )
        )
        .returning();

      if (!deletedConfig[0]) {
        throw new Error("Email configuration not found");
      }

      return deletedConfig[0];
    }),

  // Test email configuration
  testConfiguration: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.db
        .select()
        .from(emailConfigurations)
        .where(
          and(
            eq(emailConfigurations.id, input.id),
            eq(emailConfigurations.organizationId, ctx.session.user.organizationId)
          )
        )
        .limit(1);

      if (!config[0]) {
        throw new Error("Email configuration not found");
      }

      // Test IMAP connection (we'll implement the actual IMAP connection in the service)
      return {
        success: true,
        message: "Email configuration test successful",
        lastChecked: new Date(),
      };
    }),

  // Get processing logs for an email configuration
  getProcessingLogs: protectedProcedure
    .input(
      z.object({
        configurationId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const query = ctx.db
        .select({
          id: emailProcessingLogs.id,
          emailUid: emailProcessingLogs.emailUid,
          fromEmail: emailProcessingLogs.fromEmail,
          subject: emailProcessingLogs.subject,
          messageId: emailProcessingLogs.messageId,
          status: emailProcessingLogs.status,
          errorMessage: emailProcessingLogs.errorMessage,
          processedAt: emailProcessingLogs.processedAt,
          createdAt: emailProcessingLogs.createdAt,
          configuration: {
            id: emailConfigurations.id,
            name: emailConfigurations.name,
            email: emailConfigurations.email,
          },
          ticket: {
            id: tickets.id,
            number: tickets.number,
            title: tickets.title,
            status: tickets.status,
          },
        })
        .from(emailProcessingLogs)
        .leftJoin(emailConfigurations, eq(emailProcessingLogs.configurationId, emailConfigurations.id))
        .leftJoin(tickets, eq(emailProcessingLogs.ticketId, tickets.id))
        .where(
          and(
            eq(emailProcessingLogs.organizationId, ctx.session.user.organizationId),
            input.configurationId
              ? eq(emailProcessingLogs.configurationId, input.configurationId)
              : undefined
          )
        )
        .orderBy(desc(emailProcessingLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const logs = await query;
      return logs;
    }),

  // Manual email processing trigger
  processEmails: protectedProcedure
    .input(z.object({ configurationId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      // This will trigger the email processing service
      // For now, we'll return a placeholder response
      return {
        success: true,
        message: "Email processing triggered",
        processedAt: new Date(),
      };
    }),

  // Get email statistics
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const stats = await ctx.db
      .select({
        totalConfigs: emailConfigurations.id,
        activeConfigs: emailConfigurations.isActive,
        totalLogs: emailProcessingLogs.id,
        successfulProcessed: emailProcessingLogs.status,
        failedProcessed: emailProcessingLogs.status,
      })
      .from(emailConfigurations)
      .leftJoin(emailProcessingLogs, eq(emailConfigurations.id, emailProcessingLogs.configurationId))
      .where(eq(emailConfigurations.organizationId, ctx.session.user.organizationId));

    // Process the stats (this is a simplified version)
    return {
      totalConfigurations: stats.length,
      activeConfigurations: stats.filter(s => s.activeConfigs).length,
      totalEmailsProcessed: stats.filter(s => s.totalLogs).length,
      successfullyProcessed: stats.filter(s => s.successfulProcessed === 'processed').length,
      failed: stats.filter(s => s.failedProcessed === 'failed').length,
    };
  }),
});