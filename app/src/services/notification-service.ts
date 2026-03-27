import nodemailer from 'nodemailer';
import { db } from '../db';
import { 
  emailNotifications, 
  notificationPreferences, 
  slaAlerts, 
  assets, 
  tickets, 
  clients, 
  users 
} from '../db/schema';
import { eq, and, lte, sql, isNotNull } from 'drizzle-orm';

export interface NotificationContext {
  organizationId: string;
  recipientId: string;
  recipientEmail: string;
  notificationType: 'sla_breach' | 'sla_warning' | 'warranty_expiring' | 'maintenance_due' | 'ticket_assigned' | 'ticket_overdue' | 'system_alert';
  relatedTicketId?: string;
  relatedAssetId?: string;
  relatedSlaAlertId?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Queue an email notification
   */
  async queueEmailNotification(context: NotificationContext): Promise<string> {
    // Check if user has this notification type enabled
    const preference = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.organizationId, context.organizationId),
          eq(notificationPreferences.userId, context.recipientId),
          eq(notificationPreferences.notificationType, context.notificationType),
          eq(notificationPreferences.channel, 'email')
        )
      )
      .limit(1);

    // If preference exists and is disabled, skip notification
    if (preference[0] && !preference[0].isEnabled) {
      console.log(`Notification ${context.notificationType} disabled for user ${context.recipientId}`);
      return '';
    }

    // Generate email content based on notification type
    const { subject, htmlBody, textBody } = await this.generateEmailContent(context);

    // Queue the notification
    const notification = await db
      .insert(emailNotifications)
      .values({
        organizationId: context.organizationId,
        recipientId: context.recipientId,
        recipientEmail: context.recipientEmail,
        notificationType: context.notificationType,
        subject,
        htmlBody,
        textBody,
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
   * Process pending email notifications
   */
  async processPendingNotifications(): Promise<{ sent: number; failed: number }> {
    const pendingNotifications = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.status, 'pending'))
      .limit(50); // Process in batches

    let sent = 0;
    let failed = 0;

    for (const notification of pendingNotifications) {
      try {
        await this.sendEmail(notification);
        
        // Update status to sent
        await db
          .update(emailNotifications)
          .set({
            status: 'sent',
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(emailNotifications.id, notification.id));

        sent++;
      } catch (error) {
        console.error(`Failed to send notification ${notification.id}:`, error);
        
        // Update status to failed with error message
        await db
          .update(emailNotifications)
          .set({
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          })
          .where(eq(emailNotifications.id, notification.id));

        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Check for SLA breaches and send notifications
   */
  async checkSlaBreaches(): Promise<void> {
    console.log('Checking for SLA breaches...');

    const activeAlerts = await db
      .select({
        alert: slaAlerts,
        ticket: tickets,
        client: clients,
        assignee: users,
      })
      .from(slaAlerts)
      .innerJoin(tickets, eq(slaAlerts.ticketId, tickets.id))
      .innerJoin(clients, eq(tickets.clientId, clients.id))
      .leftJoin(users, eq(tickets.assigneeId, users.id))
      .where(
        and(
          eq(slaAlerts.status, 'active'),
          lte(slaAlerts.deadlineAt, new Date()) // Past deadline
        )
      );

    for (const alert of activeAlerts) {
      if (alert.assignee) {
        await this.queueEmailNotification({
          organizationId: alert.ticket.organizationId,
          recipientId: alert.assignee.id,
          recipientEmail: alert.assignee.email,
          notificationType: alert.alert.alertType === 'breach' ? 'sla_breach' : 'sla_warning',
          relatedTicketId: alert.ticket.id,
          relatedSlaAlertId: alert.alert.id,
          metadata: {
            ticketNumber: alert.ticket.number,
            ticketTitle: alert.ticket.title,
            clientName: alert.client.name,
            deadline: alert.alert.deadlineAt,
            alertMessage: alert.alert.message,
          },
        });
      }
    }
  }

  /**
   * Check for expiring warranties and send notifications
   */
  async checkWarrantyExpirations(): Promise<void> {
    console.log('Checking for warranty expirations...');
    
    const expiringAssets = await db
      .select({
        asset: assets,
        client: clients,
        organization: {
          id: sql`${assets.organizationId}`,
        },
      })
      .from(assets)
      .innerJoin(clients, eq(assets.clientId, clients.id))
      .where(
        and(
          isNotNull(assets.warrantyExpiry),
          eq(assets.status, 'active'),
          // Assets expiring within 30 days
          lte(assets.warrantyExpiry, sql`CURRENT_DATE + INTERVAL '30 days'`),
          sql`${assets.warrantyExpiry} > CURRENT_DATE` // Not already expired
        )
      );

    // Get all users in each organization to notify
    const orgUsers = new Map<string, any[]>();
    
    for (const asset of expiringAssets) {
      const orgId = asset.organization.id as string;
      
      if (!orgUsers.has(orgId)) {
        const users = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.organizationId, orgId),
              eq(users.isActive, true)
            )
          );
        orgUsers.set(orgId, users);
      }

      const recipients = orgUsers.get(orgId) || [];
      
      for (const user of recipients) {
        // Only notify managers and admins about warranty expirations
        if (user.role === 'manager' || user.role === 'admin') {
          await this.queueEmailNotification({
            organizationId: orgId,
            recipientId: user.id,
            recipientEmail: user.email,
            notificationType: 'warranty_expiring',
            relatedAssetId: asset.asset.id,
            metadata: {
              assetName: asset.asset.name,
              serialNumber: asset.asset.serialNumber,
              clientName: asset.client.name,
              warrantyExpiry: asset.asset.warrantyExpiry,
              daysUntilExpiry: sql`EXTRACT(days FROM ${assets.warrantyExpiry} - CURRENT_DATE)`,
            },
          });
        }
      }
    }
  }

  /**
   * Check for maintenance due dates and send notifications
   */
  async checkMaintenanceDue(): Promise<void> {
    console.log('Checking for maintenance due...');
    
    const maintenanceAssets = await db
      .select({
        asset: assets,
        client: clients,
        organization: {
          id: sql`${assets.organizationId}`,
        },
      })
      .from(assets)
      .innerJoin(clients, eq(assets.clientId, clients.id))
      .where(
        and(
          isNotNull(assets.nextMaintenanceDate),
          eq(assets.status, 'active'),
          // Maintenance due within 7 days
          lte(assets.nextMaintenanceDate, sql`CURRENT_DATE + INTERVAL '7 days'`),
          sql`${assets.nextMaintenanceDate} > CURRENT_DATE` // Not already past due
        )
      );

    // Similar logic to warranty notifications
    const orgUsers = new Map<string, any[]>();
    
    for (const asset of maintenanceAssets) {
      const orgId = asset.organization.id as string;
      
      if (!orgUsers.has(orgId)) {
        const users = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.organizationId, orgId),
              eq(users.isActive, true)
            )
          );
        orgUsers.set(orgId, users);
      }

      const recipients = orgUsers.get(orgId) || [];
      
      for (const user of recipients) {
        if (user.role === 'manager' || user.role === 'admin' || user.role === 'technician') {
          await this.queueEmailNotification({
            organizationId: orgId,
            recipientId: user.id,
            recipientEmail: user.email,
            notificationType: 'maintenance_due',
            relatedAssetId: asset.asset.id,
            metadata: {
              assetName: asset.asset.name,
              serialNumber: asset.asset.serialNumber,
              clientName: asset.client.name,
              maintenanceDate: asset.asset.nextMaintenanceDate,
              daysUntilDue: sql`EXTRACT(days FROM ${assets.nextMaintenanceDate} - CURRENT_DATE)`,
            },
          });
        }
      }
    }
  }

  /**
   * Generate email content based on notification type
   */
  private async generateEmailContent(context: NotificationContext): Promise<{
    subject: string;
    htmlBody: string;
    textBody: string;
  }> {
    const metadata = context.metadata || {};

    switch (context.notificationType) {
      case 'sla_breach':
        return {
          subject: `SLA BREACH: Ticket ${metadata.ticketNumber} - ${metadata.ticketTitle}`,
          htmlBody: this.generateSlaBreachHtml(metadata),
          textBody: this.generateSlaBreachText(metadata),
        };

      case 'sla_warning':
        return {
          subject: `SLA WARNING: Ticket ${metadata.ticketNumber} approaching deadline`,
          htmlBody: this.generateSlaWarningHtml(metadata),
          textBody: this.generateSlaWarningText(metadata),
        };

      case 'warranty_expiring':
        return {
          subject: `WARRANTY ALERT: ${metadata.assetName} warranty expiring soon`,
          htmlBody: this.generateWarrantyExpiringHtml(metadata),
          textBody: this.generateWarrantyExpiringText(metadata),
        };

      case 'maintenance_due':
        return {
          subject: `MAINTENANCE DUE: ${metadata.assetName} requires maintenance`,
          htmlBody: this.generateMaintenanceDueHtml(metadata),
          textBody: this.generateMaintenanceDueText(metadata),
        };

      default:
        return {
          subject: 'HelixPSA Notification',
          htmlBody: '<p>You have a new notification in HelixPSA.</p>',
          textBody: 'You have a new notification in HelixPSA.',
        };
    }
  }

  /**
   * Send email using nodemailer
   */
  private async sendEmail(notification: any): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'notifications@helixpsa.com',
      to: notification.recipientEmail,
      subject: notification.subject,
      text: notification.textBody,
      html: notification.htmlBody,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // Email template generators
  private generateSlaBreachHtml(metadata: any): string {
    return `
      <h2 style="color: #dc2626;">🚨 SLA BREACH ALERT</h2>
      <p><strong>Ticket:</strong> #${metadata.ticketNumber}</p>
      <p><strong>Title:</strong> ${metadata.ticketTitle}</p>
      <p><strong>Client:</strong> ${metadata.clientName}</p>
      <p><strong>Deadline:</strong> ${new Date(metadata.deadline).toLocaleString()}</p>
      <p style="color: #dc2626;"><strong>This ticket has exceeded its SLA deadline. Immediate action required!</strong></p>
      <p><a href="${process.env.APP_URL}/tickets/${metadata.ticketId}" style="background: #dc2626; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">View Ticket</a></p>
    `;
  }

  private generateSlaBreachText(metadata: any): string {
    return `
🚨 SLA BREACH ALERT

Ticket: #${metadata.ticketNumber}
Title: ${metadata.ticketTitle}
Client: ${metadata.clientName}
Deadline: ${new Date(metadata.deadline).toLocaleString()}

This ticket has exceeded its SLA deadline. Immediate action required!

View ticket: ${process.env.APP_URL}/tickets/${metadata.ticketId}
    `;
  }

  private generateSlaWarningHtml(metadata: any): string {
    return `
      <h2 style="color: #f59e0b;">⚠️ SLA WARNING</h2>
      <p><strong>Ticket:</strong> #${metadata.ticketNumber}</p>
      <p><strong>Title:</strong> ${metadata.ticketTitle}</p>
      <p><strong>Client:</strong> ${metadata.clientName}</p>
      <p><strong>Deadline:</strong> ${new Date(metadata.deadline).toLocaleString()}</p>
      <p style="color: #f59e0b;"><strong>This ticket is approaching its SLA deadline.</strong></p>
      <p><a href="${process.env.APP_URL}/tickets/${metadata.ticketId}" style="background: #f59e0b; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">View Ticket</a></p>
    `;
  }

  private generateSlaWarningText(metadata: any): string {
    return `
⚠️ SLA WARNING

Ticket: #${metadata.ticketNumber}
Title: ${metadata.ticketTitle}
Client: ${metadata.clientName}
Deadline: ${new Date(metadata.deadline).toLocaleString()}

This ticket is approaching its SLA deadline.

View ticket: ${process.env.APP_URL}/tickets/${metadata.ticketId}
    `;
  }

  private generateWarrantyExpiringHtml(metadata: any): string {
    return `
      <h2 style="color: #f59e0b;">🔧 WARRANTY EXPIRING</h2>
      <p><strong>Asset:</strong> ${metadata.assetName}</p>
      <p><strong>Serial Number:</strong> ${metadata.serialNumber || 'N/A'}</p>
      <p><strong>Client:</strong> ${metadata.clientName}</p>
      <p><strong>Warranty Expires:</strong> ${new Date(metadata.warrantyExpiry).toLocaleDateString()}</p>
      <p style="color: #f59e0b;"><strong>This asset's warranty is expiring soon. Consider renewal or replacement planning.</strong></p>
      <p><a href="${process.env.APP_URL}/assets" style="background: #f59e0b; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">View Assets</a></p>
    `;
  }

  private generateWarrantyExpiringText(metadata: any): string {
    return `
🔧 WARRANTY EXPIRING

Asset: ${metadata.assetName}
Serial Number: ${metadata.serialNumber || 'N/A'}
Client: ${metadata.clientName}
Warranty Expires: ${new Date(metadata.warrantyExpiry).toLocaleDateString()}

This asset's warranty is expiring soon. Consider renewal or replacement planning.

View assets: ${process.env.APP_URL}/assets
    `;
  }

  private generateMaintenanceDueHtml(metadata: any): string {
    return `
      <h2 style="color: #0ea5e9;">🔧 MAINTENANCE DUE</h2>
      <p><strong>Asset:</strong> ${metadata.assetName}</p>
      <p><strong>Serial Number:</strong> ${metadata.serialNumber || 'N/A'}</p>
      <p><strong>Client:</strong> ${metadata.clientName}</p>
      <p><strong>Maintenance Due:</strong> ${new Date(metadata.maintenanceDate).toLocaleDateString()}</p>
      <p style="color: #0ea5e9;"><strong>This asset requires scheduled maintenance.</strong></p>
      <p><a href="${process.env.APP_URL}/assets" style="background: #0ea5e9; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">View Assets</a></p>
    `;
  }

  private generateMaintenanceDueText(metadata: any): string {
    return `
🔧 MAINTENANCE DUE

Asset: ${metadata.assetName}
Serial Number: ${metadata.serialNumber || 'N/A'}
Client: ${metadata.clientName}
Maintenance Due: ${new Date(metadata.maintenanceDate).toLocaleDateString()}

This asset requires scheduled maintenance.

View assets: ${process.env.APP_URL}/assets
    `;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();