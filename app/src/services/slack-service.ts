import { WebClient } from '@slack/web-api';
import { db } from '../db';
import { 
  slackIntegrations,
  slackNotifications, 
  notificationPreferences, 
  users 
} from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface SlackNotificationContext {
  organizationId: string;
  recipientId: string;
  slackChannelId?: string; // If not provided, will send as DM to user
  slackChannelName?: string;
  notificationType: 'sla_breach' | 'sla_warning' | 'warranty_expiring' | 'maintenance_due' | 'ticket_assigned' | 'ticket_overdue' | 'system_alert';
  relatedTicketId?: string;
  relatedAssetId?: string;
  relatedSlaAlertId?: string;
  metadata?: Record<string, any>;
}

export interface SlackIntegrationConfig {
  organizationId: string;
  teamId: string;
  teamName: string;
  botUserId: string;
  botAccessToken: string;
}

export class SlackService {
  private readonly encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.SLACK_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Encrypt sensitive token data
   */
  private encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive token data
   */
  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-cbc';
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Set up Slack integration for an organization
   */
  async addSlackIntegration(config: SlackIntegrationConfig): Promise<string> {
    const encryptedToken = this.encrypt(config.botAccessToken);

    const integration = await db
      .insert(slackIntegrations)
      .values({
        organizationId: config.organizationId,
        teamId: config.teamId,
        teamName: config.teamName,
        botUserId: config.botUserId,
        botAccessToken: encryptedToken,
        isActive: true,
      })
      .returning();

    return integration[0]!.id;
  }

  /**
   * Get Slack integration for an organization
   */
  async getSlackIntegration(organizationId: string): Promise<SlackIntegrationConfig | null> {
    const integration = await db
      .select()
      .from(slackIntegrations)
      .where(
        and(
          eq(slackIntegrations.organizationId, organizationId),
          eq(slackIntegrations.isActive, true)
        )
      )
      .limit(1);

    if (!integration[0]) return null;

    const decryptedToken = this.decrypt(integration[0].botAccessToken);

    return {
      organizationId: integration[0].organizationId,
      teamId: integration[0].teamId,
      teamName: integration[0].teamName,
      botUserId: integration[0].botUserId,
      botAccessToken: decryptedToken,
    };
  }

  /**
   * Queue a Slack notification
   */
  async queueSlackNotification(context: SlackNotificationContext): Promise<string> {
    // Check if user has Slack notifications enabled for this type
    const preference = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.organizationId, context.organizationId),
          eq(notificationPreferences.userId, context.recipientId),
          eq(notificationPreferences.notificationType, context.notificationType),
          eq(notificationPreferences.channel, 'slack')
        )
      )
      .limit(1);

    // If preference exists and is disabled, skip notification
    if (preference[0] && !preference[0].isEnabled) {
      console.log(`Slack notification ${context.notificationType} disabled for user ${context.recipientId}`);
      return '';
    }

    // Generate Slack message content
    const { message, blocks } = this.generateSlackContent(context);

    // Get user's Slack ID from their profile if available
    let slackChannelId = context.slackChannelId;
    if (!slackChannelId) {
      // Default to sending as DM - we'll need the user's Slack ID
      // For now, we'll use a placeholder and handle this in the UI
      slackChannelId = '@user'; // This will be resolved when sending
    }

    // Queue the notification
    const notification = await db
      .insert(slackNotifications)
      .values({
        organizationId: context.organizationId,
        recipientId: context.recipientId,
        slackChannelId,
        slackChannelName: context.slackChannelName || '',
        notificationType: context.notificationType,
        message,
        blocks: blocks ? JSON.stringify(blocks) : null,
        status: 'pending',
        relatedTicketId: context.relatedTicketId || null,
        relatedAssetId: context.relatedAssetId || null,
        relatedSlaAlertId: context.relatedSlaAlertId || null,
        metadata: context.metadata ? JSON.stringify(context.metadata) : null,
      })
      .returning();

    return notification[0]!.id;
  }

  /**
   * Process pending Slack notifications
   */
  async processPendingNotifications(): Promise<{ sent: number; failed: number }> {
    const pendingNotifications = await db
      .select({
        notification: slackNotifications,
        integration: slackIntegrations,
      })
      .from(slackNotifications)
      .innerJoin(
        slackIntegrations,
        and(
          eq(slackNotifications.organizationId, slackIntegrations.organizationId),
          eq(slackIntegrations.isActive, true)
        )
      )
      .where(eq(slackNotifications.status, 'pending'))
      .limit(50); // Process in batches

    let sent = 0;
    let failed = 0;

    for (const { notification, integration } of pendingNotifications) {
      try {
        await this.sendSlackMessage(notification, integration);
        
        // Update status to sent
        await db
          .update(slackNotifications)
          .set({
            status: 'sent',
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(slackNotifications.id, notification.id));

        sent++;
      } catch (error) {
        console.error(`Failed to send Slack notification ${notification.id}:`, error);
        
        // Update status to failed with error message
        await db
          .update(slackNotifications)
          .set({
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          })
          .where(eq(slackNotifications.id, notification.id));

        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send a Slack message using the Web API
   */
  private async sendSlackMessage(notification: any, integration: any): Promise<void> {
    const decryptedToken = this.decrypt(integration.botAccessToken);
    const client = new WebClient(decryptedToken);

    const messagePayload: any = {
      channel: notification.slackChannelId,
      text: notification.message,
    };

    // Add blocks if available for rich formatting
    if (notification.blocks) {
      try {
        messagePayload.blocks = JSON.parse(notification.blocks);
      } catch (error) {
        console.warn('Failed to parse Slack blocks JSON:', error);
      }
    }

    const result = await client.chat.postMessage(messagePayload);

    // Store the Slack timestamp for potential future updates/threading
    if (result.ts) {
      await db
        .update(slackNotifications)
        .set({
          slackTimestamp: result.ts as string,
        })
        .where(eq(slackNotifications.id, notification.id));
    }
  }

  /**
   * Generate Slack message content based on notification type
   */
  private generateSlackContent(context: SlackNotificationContext): {
    message: string;
    blocks?: any[];
  } {
    const metadata = context.metadata || {};

    switch (context.notificationType) {
      case 'sla_breach':
        return this.generateSlaBreachSlack(metadata);
      case 'sla_warning':
        return this.generateSlaWarningSlack(metadata);
      case 'warranty_expiring':
        return this.generateWarrantyExpiringSlack(metadata);
      case 'maintenance_due':
        return this.generateMaintenanceDueSlack(metadata);
      case 'ticket_assigned':
        return this.generateTicketAssignedSlack(metadata);
      default:
        return {
          message: '📋 New notification from HelixPSA',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '📋 *New notification from HelixPSA*\n\nYou have a new notification. Please check your dashboard for details.',
              },
            },
          ],
        };
    }
  }

  /**
   * Generate SLA breach Slack content
   */
  private generateSlaBreachSlack(metadata: any): { message: string; blocks: any[] } {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const ticketUrl = `${appUrl}/tickets/${metadata.ticketId}`;

    return {
      message: `🚨 SLA BREACH: Ticket #${metadata.ticketNumber} - ${metadata.ticketTitle}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🚨 *SLA BREACH ALERT*\n\n*Ticket:* #${metadata.ticketNumber}\n*Title:* ${metadata.ticketTitle}\n*Client:* ${metadata.clientName}\n*Deadline:* ${new Date(metadata.deadline).toLocaleString()}\n\n⚠️ *This ticket has exceeded its SLA deadline. Immediate action required!*`,
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Ticket',
            },
            style: 'danger',
            url: ticketUrl,
            action_id: 'view_ticket',
          },
        },
      ],
    };
  }

  /**
   * Generate SLA warning Slack content
   */
  private generateSlaWarningSlack(metadata: any): { message: string; blocks: any[] } {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const ticketUrl = `${appUrl}/tickets/${metadata.ticketId}`;

    return {
      message: `⚠️ SLA WARNING: Ticket #${metadata.ticketNumber} approaching deadline`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⚠️ *SLA WARNING*\n\n*Ticket:* #${metadata.ticketNumber}\n*Title:* ${metadata.ticketTitle}\n*Client:* ${metadata.clientName}\n*Deadline:* ${new Date(metadata.deadline).toLocaleString()}\n\n⏰ *This ticket is approaching its SLA deadline.*`,
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Ticket',
            },
            style: 'primary',
            url: ticketUrl,
            action_id: 'view_ticket',
          },
        },
      ],
    };
  }

  /**
   * Generate warranty expiring Slack content
   */
  private generateWarrantyExpiringSlack(metadata: any): { message: string; blocks: any[] } {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const assetsUrl = `${appUrl}/assets`;

    return {
      message: `🔧 WARRANTY ALERT: ${metadata.assetName} warranty expiring soon`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔧 *WARRANTY EXPIRING*\n\n*Asset:* ${metadata.assetName}\n*Serial:* ${metadata.serialNumber || 'N/A'}\n*Client:* ${metadata.clientName}\n*Warranty Expires:* ${new Date(metadata.warrantyExpiry).toLocaleDateString()}\n\n📋 *Consider renewal or replacement planning.*`,
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Assets',
            },
            url: assetsUrl,
            action_id: 'view_assets',
          },
        },
      ],
    };
  }

  /**
   * Generate maintenance due Slack content
   */
  private generateMaintenanceDueSlack(metadata: any): { message: string; blocks: any[] } {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const assetsUrl = `${appUrl}/assets`;

    return {
      message: `🔧 MAINTENANCE DUE: ${metadata.assetName} requires maintenance`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔧 *MAINTENANCE DUE*\n\n*Asset:* ${metadata.assetName}\n*Serial:* ${metadata.serialNumber || 'N/A'}\n*Client:* ${metadata.clientName}\n*Maintenance Due:* ${new Date(metadata.maintenanceDate).toLocaleDateString()}\n\n🛠️ *This asset requires scheduled maintenance.*`,
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Assets',
            },
            url: assetsUrl,
            action_id: 'view_assets',
          },
        },
      ],
    };
  }

  /**
   * Generate ticket assigned Slack content
   */
  private generateTicketAssignedSlack(metadata: any): { message: string; blocks: any[] } {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const ticketUrl = `${appUrl}/tickets/${metadata.ticketId}`;

    return {
      message: `📋 New ticket assigned: #${metadata.ticketNumber} - ${metadata.ticketTitle}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📋 *New Ticket Assigned*\n\n*Ticket:* #${metadata.ticketNumber}\n*Title:* ${metadata.ticketTitle}\n*Client:* ${metadata.clientName}\n*Priority:* ${metadata.priority}\n\n👨‍💻 *This ticket has been assigned to you.*`,
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Ticket',
            },
            style: 'primary',
            url: ticketUrl,
            action_id: 'view_ticket',
          },
        },
      ],
    };
  }

  /**
   * Test Slack integration
   */
  async testSlackIntegration(organizationId: string): Promise<boolean> {
    try {
      const integration = await this.getSlackIntegration(organizationId);
      if (!integration) return false;

      const client = new WebClient(integration.botAccessToken);
      const result = await client.auth.test();
      
      return result.ok === true;
    } catch (error) {
      console.error('Slack integration test failed:', error);
      return false;
    }
  }

  /**
   * Get available Slack channels for an organization
   */
  async getSlackChannels(organizationId: string): Promise<Array<{ id: string; name: string; is_member: boolean }>> {
    try {
      const integration = await this.getSlackIntegration(organizationId);
      if (!integration) return [];

      const client = new WebClient(integration.botAccessToken);
      const result = await client.conversations.list({
        types: 'public_channel,private_channel',
      });

      return (result.channels || []).map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        is_member: channel.is_member || false,
      }));
    } catch (error) {
      console.error('Failed to get Slack channels:', error);
      return [];
    }
  }

  /**
   * Disable Slack integration
   */
  async disableSlackIntegration(organizationId: string): Promise<void> {
    await db
      .update(slackIntegrations)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(slackIntegrations.organizationId, organizationId));
  }
}

// Export singleton instance
export const slackService = new SlackService();