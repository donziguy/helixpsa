import { z } from "zod";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { 
  slackIntegrations,
  slackNotifications, 
  notificationPreferences,
  users 
} from "../../../db/schema";
import { slackService } from "../../../services/slack-service";
import { TRPCError } from "@trpc/server";

export const slackRouter = createTRPCRouter({
  // Get Slack integration status
  getIntegration: protectedProcedure.query(async ({ ctx }) => {
    const integration = await ctx.db
      .select({
        id: slackIntegrations.id,
        teamId: slackIntegrations.teamId,
        teamName: slackIntegrations.teamName,
        botUserId: slackIntegrations.botUserId,
        isActive: slackIntegrations.isActive,
        createdAt: slackIntegrations.createdAt,
        updatedAt: slackIntegrations.updatedAt,
      })
      .from(slackIntegrations)
      .where(
        and(
          eq(slackIntegrations.organizationId, ctx.session.user.organizationId),
          eq(slackIntegrations.isActive, true)
        )
      )
      .limit(1);

    return integration[0] || null;
  }),

  // Add Slack integration
  addIntegration: protectedProcedure
    .input(
      z.object({
        teamId: z.string().min(1),
        teamName: z.string().min(1),
        botUserId: z.string().min(1),
        botAccessToken: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Test the integration first
        const testClient = new (await import('@slack/web-api')).WebClient(input.botAccessToken);
        const testResult = await testClient.auth.test();
        
        if (!testResult.ok) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid Slack bot token',
          });
        }

        const integrationId = await slackService.addSlackIntegration({
          organizationId: ctx.session.user.organizationId,
          teamId: input.teamId,
          teamName: input.teamName,
          botUserId: input.botUserId,
          botAccessToken: input.botAccessToken,
        });

        return { success: true, integrationId };
      } catch (error) {
        console.error('Failed to add Slack integration:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to add Slack integration',
        });
      }
    }),

  // Test Slack integration
  testIntegration: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const isWorking = await slackService.testSlackIntegration(ctx.session.user.organizationId);
      
      return { 
        success: isWorking, 
        message: isWorking ? 'Slack integration is working' : 'Slack integration test failed' 
      };
    } catch (error) {
      console.error('Failed to test Slack integration:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to test Slack integration',
      });
    }
  }),

  // Get Slack channels
  getChannels: protectedProcedure.query(async ({ ctx }) => {
    try {
      const channels = await slackService.getSlackChannels(ctx.session.user.organizationId);
      return channels;
    } catch (error) {
      console.error('Failed to get Slack channels:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get Slack channels',
      });
    }
  }),

  // Get Slack notification preferences for the current user
  getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
    const preferences = await ctx.db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.organizationId, ctx.session.user.organizationId),
          eq(notificationPreferences.userId, ctx.session.user.id),
          eq(notificationPreferences.channel, 'slack')
        )
      );

    // Return all notification types with default enabled state if no preference exists
    const allNotificationTypes = [
      'sla_breach',
      'sla_warning', 
      'warranty_expiring',
      'maintenance_due',
      'ticket_assigned',
      'ticket_overdue',
      'system_alert'
    ] as const;

    const result = allNotificationTypes.map(type => {
      const pref = preferences.find(p => p.notificationType === type);
      return {
        notificationType: type,
        channel: 'slack' as const,
        isEnabled: pref?.isEnabled ?? false, // Default to disabled for Slack
        settings: pref?.settings ? JSON.parse(pref.settings) : {
          slackChannelId: null,
          slackChannelName: null,
          useDirectMessage: true,
        },
        id: pref?.id,
      };
    });

    return result;
  }),

  // Update Slack notification preferences
  updateNotificationPreferences: protectedProcedure
    .input(
      z.array(
        z.object({
          notificationType: z.enum([
            'sla_breach',
            'sla_warning',
            'warranty_expiring', 
            'maintenance_due',
            'ticket_assigned',
            'ticket_overdue',
            'system_alert'
          ]),
          isEnabled: z.boolean(),
          settings: z.object({
            slackChannelId: z.string().nullable().optional(),
            slackChannelName: z.string().nullable().optional(),
            useDirectMessage: z.boolean().optional(),
          }).optional(),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      for (const preference of input) {
        // Check if preference already exists
        const existing = await ctx.db
          .select()
          .from(notificationPreferences)
          .where(
            and(
              eq(notificationPreferences.organizationId, ctx.session.user.organizationId),
              eq(notificationPreferences.userId, ctx.session.user.id),
              eq(notificationPreferences.notificationType, preference.notificationType),
              eq(notificationPreferences.channel, 'slack')
            )
          )
          .limit(1);

        const settingsJson = preference.settings ? JSON.stringify(preference.settings) : null;

        if (existing[0]) {
          // Update existing preference
          await ctx.db
            .update(notificationPreferences)
            .set({
              isEnabled: preference.isEnabled,
              settings: settingsJson,
              updatedAt: new Date(),
            })
            .where(eq(notificationPreferences.id, existing[0].id));
        } else {
          // Create new preference
          await ctx.db
            .insert(notificationPreferences)
            .values({
              organizationId: ctx.session.user.organizationId,
              userId: ctx.session.user.id,
              notificationType: preference.notificationType,
              channel: 'slack',
              isEnabled: preference.isEnabled,
              settings: settingsJson,
            });
        }
      }

      return { success: true };
    }),

  // Get Slack notification history
  getNotificationHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z.enum(['pending', 'sent', 'failed', 'bounced']).optional(),
        notificationType: z.enum([
          'sla_breach',
          'sla_warning',
          'warranty_expiring',
          'maintenance_due',
          'ticket_assigned',
          'ticket_overdue',
          'system_alert'
        ]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions = [
        eq(slackNotifications.organizationId, ctx.session.user.organizationId),
      ];

      if (input.status) {
        whereConditions.push(eq(slackNotifications.status, input.status));
      }

      if (input.notificationType) {
        whereConditions.push(eq(slackNotifications.notificationType, input.notificationType));
      }

      const notifications = await ctx.db
        .select({
          id: slackNotifications.id,
          notificationType: slackNotifications.notificationType,
          slackChannelName: slackNotifications.slackChannelName,
          message: slackNotifications.message,
          status: slackNotifications.status,
          errorMessage: slackNotifications.errorMessage,
          sentAt: slackNotifications.sentAt,
          createdAt: slackNotifications.createdAt,
          recipient: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(slackNotifications)
        .leftJoin(users, eq(slackNotifications.recipientId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(slackNotifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return notifications;
    }),

  // Get Slack notification statistics
  getNotificationStatistics: protectedProcedure.query(async ({ ctx }) => {
    const stats = await ctx.db
      .select({
        status: slackNotifications.status,
        notificationType: slackNotifications.notificationType,
        count: count(),
      })
      .from(slackNotifications)
      .where(eq(slackNotifications.organizationId, ctx.session.user.organizationId))
      .groupBy(slackNotifications.status, slackNotifications.notificationType);

    const result = {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      byType: {} as Record<string, number>,
    };

    stats.forEach(stat => {
      result.total += stat.count;
      
      if (stat.status === 'pending') result.pending += stat.count;
      else if (stat.status === 'sent') result.sent += stat.count;
      else if (stat.status === 'failed') result.failed += stat.count;

      result.byType[stat.notificationType] = (result.byType[stat.notificationType] || 0) + stat.count;
    });

    return result;
  }),

  // Process pending Slack notifications manually
  processPending: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await slackService.processPendingNotifications();
      return {
        success: true,
        message: `Processed ${result.sent + result.failed} Slack notifications`,
        sent: result.sent,
        failed: result.failed,
      };
    } catch (error) {
      console.error('Failed to process pending Slack notifications:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process pending Slack notifications',
      });
    }
  }),

  // Send test Slack notification
  sendTestNotification: protectedProcedure
    .input(
      z.object({
        notificationType: z.enum([
          'sla_breach',
          'sla_warning',
          'warranty_expiring',
          'maintenance_due',
          'ticket_assigned',
          'ticket_overdue',
          'system_alert'
        ]),
        slackChannelId: z.string().optional(),
        slackChannelName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const testMetadata = {
          ticketNumber: 'TEST-001',
          ticketTitle: 'Test Slack Notification',
          ticketId: 'test-ticket-id',
          clientName: 'Test Client',
          priority: 'high',
          deadline: new Date(),
          assetName: 'Test Asset',
          serialNumber: 'TEST123',
          warrantyExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          maintenanceDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        };

        const notificationId = await slackService.queueSlackNotification({
          organizationId: ctx.session.user.organizationId,
          recipientId: ctx.session.user.id,
          slackChannelId: input.slackChannelId,
          slackChannelName: input.slackChannelName,
          notificationType: input.notificationType,
          metadata: testMetadata,
        });

        // Process the notification immediately for testing
        if (notificationId) {
          await slackService.processPendingNotifications();
        }

        return { 
          success: true, 
          message: 'Test Slack notification sent successfully',
          notificationId,
        };
      } catch (error) {
        console.error('Failed to send test Slack notification:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send test Slack notification',
        });
      }
    }),

  // Disable Slack integration
  disableIntegration: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await slackService.disableSlackIntegration(ctx.session.user.organizationId);
      return { success: true, message: 'Slack integration disabled successfully' };
    } catch (error) {
      console.error('Failed to disable Slack integration:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to disable Slack integration',
      });
    }
  }),

  // Retry failed Slack notifications
  retryFailed: protectedProcedure
    .input(
      z.object({
        notificationIds: z.array(z.string().uuid()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const whereConditions = [
          eq(slackNotifications.organizationId, ctx.session.user.organizationId),
          eq(slackNotifications.status, 'failed'),
        ];

        if (input.notificationIds && input.notificationIds.length > 0) {
          whereConditions.push(
            sql`${slackNotifications.id} = ANY(${input.notificationIds})`
          );
        }

        // Reset failed notifications to pending
        await ctx.db
          .update(slackNotifications)
          .set({
            status: 'pending',
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(and(...whereConditions));

        // Process them
        const result = await slackService.processPendingNotifications();

        return {
          success: true,
          message: 'Failed Slack notifications retry completed',
          sent: result.sent,
          failed: result.failed,
        };
      } catch (error) {
        console.error('Failed to retry Slack notifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retry Slack notifications',
        });
      }
    }),
});