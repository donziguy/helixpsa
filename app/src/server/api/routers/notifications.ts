import { z } from "zod";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { 
  notificationPreferences, 
  emailNotifications, 
  users 
} from "../../../db/schema";
import { notificationService } from "../../../services/notification-service";
import { TRPCError } from "@trpc/server";

export const notificationsRouter = createTRPCRouter({
  // Get user notification preferences
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const preferences = await ctx.db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.organizationId, ctx.session.user.organizationId),
          eq(notificationPreferences.userId, ctx.session.user.id)
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
      const pref = preferences.find(p => p.notificationType === type && p.channel === 'email');
      return {
        notificationType: type,
        channel: 'email' as const,
        isEnabled: pref?.isEnabled ?? true, // Default to enabled
        settings: pref?.settings ? JSON.parse(pref.settings) : {
          frequency: 'immediate',
          escalationLevel: 'all',
          assignedOnly: false,
          digest: false,
        },
        id: pref?.id,
      };
    });

    return result;
  }),

  // Update notification preferences
  updatePreferences: protectedProcedure
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
          channel: z.enum(['email', 'sms', 'webhook', 'internal']),
          isEnabled: z.boolean(),
          settings: z.object({
            frequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).optional(),
            escalationLevel: z.enum(['all', 'high_priority', 'critical_only']).optional(),
            assignedOnly: z.boolean().optional(),
            digest: z.boolean().optional(),
            quietHours: z.object({
              start: z.string(),
              end: z.string(),
            }).optional(),
            clientFilter: z.array(z.string()).optional(),
            reminderInterval: z.number().optional(),
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
              eq(notificationPreferences.channel, preference.channel)
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
              channel: preference.channel,
              isEnabled: preference.isEnabled,
              settings: settingsJson,
            });
        }
      }

      return { success: true };
    }),

  // Get email notification history
  getEmailHistory: protectedProcedure
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
        eq(emailNotifications.organizationId, ctx.session.user.organizationId),
      ];

      if (input.status) {
        whereConditions.push(eq(emailNotifications.status, input.status));
      }

      if (input.notificationType) {
        whereConditions.push(eq(emailNotifications.notificationType, input.notificationType));
      }

      const notifications = await ctx.db
        .select({
          id: emailNotifications.id,
          notificationType: emailNotifications.notificationType,
          subject: emailNotifications.subject,
          status: emailNotifications.status,
          errorMessage: emailNotifications.errorMessage,
          sentAt: emailNotifications.sentAt,
          createdAt: emailNotifications.createdAt,
          recipient: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(emailNotifications)
        .leftJoin(users, eq(emailNotifications.recipientId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(emailNotifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return notifications;
    }),

  // Get notification statistics
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const stats = await ctx.db
      .select({
        status: emailNotifications.status,
        notificationType: emailNotifications.notificationType,
        count: count(),
      })
      .from(emailNotifications)
      .where(eq(emailNotifications.organizationId, ctx.session.user.organizationId))
      .groupBy(emailNotifications.status, emailNotifications.notificationType);

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

  // Manually trigger notification checks
  triggerChecks: protectedProcedure
    .input(
      z.object({
        checkType: z.enum(['sla', 'warranty', 'maintenance', 'all']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        switch (input.checkType) {
          case 'sla':
            await notificationService.checkSlaBreaches();
            break;
          case 'warranty':
            await notificationService.checkWarrantyExpirations();
            break;
          case 'maintenance':
            await notificationService.checkMaintenanceDue();
            break;
          case 'all':
            await notificationService.checkSlaBreaches();
            await notificationService.checkWarrantyExpirations();
            await notificationService.checkMaintenanceDue();
            break;
        }

        return { success: true, message: `${input.checkType} checks completed` };
      } catch (error) {
        console.error('Notification check failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to trigger notification checks',
        });
      }
    }),

  // Process pending email notifications
  processPending: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await notificationService.processPendingNotifications();
      return {
        success: true,
        message: `Processed ${result.sent + result.failed} notifications`,
        sent: result.sent,
        failed: result.failed,
      };
    } catch (error) {
      console.error('Failed to process pending notifications:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process pending notifications',
      });
    }
  }),

  // Test notification (send a test email)
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const testMetadata = {
          ticketNumber: 'TEST-001',
          ticketTitle: 'Test Notification',
          clientName: 'Test Client',
          deadline: new Date(),
          assetName: 'Test Asset',
          serialNumber: 'TEST123',
          warrantyExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          maintenanceDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        };

        const notificationId = await notificationService.queueEmailNotification({
          organizationId: ctx.session.user.organizationId,
          recipientId: ctx.session.user.id,
          recipientEmail: ctx.session.user.email,
          notificationType: input.notificationType,
          metadata: testMetadata,
        });

        return { 
          success: true, 
          message: 'Test notification queued successfully',
          notificationId,
        };
      } catch (error) {
        console.error('Failed to send test notification:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send test notification',
        });
      }
    }),

  // Retry failed notifications
  retryFailed: protectedProcedure
    .input(
      z.object({
        notificationIds: z.array(z.string().uuid()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const whereConditions = [
          eq(emailNotifications.organizationId, ctx.session.user.organizationId),
          eq(emailNotifications.status, 'failed'),
        ];

        if (input.notificationIds && input.notificationIds.length > 0) {
          whereConditions.push(sql`${emailNotifications.id} = ANY(${input.notificationIds})`);
        }

        // Reset failed notifications to pending
        await ctx.db
          .update(emailNotifications)
          .set({
            status: 'pending',
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(and(...whereConditions));

        // Process them
        const result = await notificationService.processPendingNotifications();

        return {
          success: true,
          message: 'Failed notifications retry completed',
          sent: result.sent,
          failed: result.failed,
        };
      } catch (error) {
        console.error('Failed to retry notifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retry notifications',
        });
      }
    }),
});