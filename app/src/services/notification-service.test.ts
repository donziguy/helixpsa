import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from './notification-service';
import { db } from '../db';

// Mock the database
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransporter: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    })),
  },
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationService = new NotificationService();
  });

  describe('queueEmailNotification', () => {
    it('should queue a notification successfully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No existing preference
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'test-notification-id' }]),
        }),
      });

      // @ts-ignore
      db.select = mockSelect;
      // @ts-ignore
      db.insert = mockInsert;

      const result = await notificationService.queueEmailNotification({
        organizationId: 'org-1',
        recipientId: 'user-1',
        recipientEmail: 'test@example.com',
        notificationType: 'sla_breach',
        metadata: {
          ticketNumber: 'TEST-001',
          ticketTitle: 'Test Ticket',
          clientName: 'Test Client',
          deadline: new Date(),
        },
      });

      expect(result).toBe('test-notification-id');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should skip notification if user has it disabled', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ isEnabled: false }]),
          }),
        }),
      });

      // @ts-ignore
      db.select = mockSelect;

      const result = await notificationService.queueEmailNotification({
        organizationId: 'org-1',
        recipientId: 'user-1',
        recipientEmail: 'test@example.com',
        notificationType: 'sla_breach',
      });

      expect(result).toBe('');
    });
  });

  describe('generateEmailContent', () => {
    it('should generate SLA breach email content', async () => {
      const metadata = {
        ticketNumber: 'TEST-001',
        ticketTitle: 'Test Ticket',
        clientName: 'Test Client',
        deadline: new Date(),
      };

      // @ts-ignore - accessing private method for testing
      const result = await notificationService.generateEmailContent({
        organizationId: 'org-1',
        recipientId: 'user-1',
        recipientEmail: 'test@example.com',
        notificationType: 'sla_breach',
        metadata,
      });

      expect(result.subject).toContain('SLA BREACH');
      expect(result.subject).toContain('TEST-001');
      expect(result.htmlBody).toContain('Test Ticket');
      expect(result.textBody).toContain('Test Client');
    });

    it('should generate warranty expiring email content', async () => {
      const metadata = {
        assetName: 'Test Asset',
        serialNumber: 'SN123',
        clientName: 'Test Client',
        warrantyExpiry: new Date(),
      };

      // @ts-ignore - accessing private method for testing
      const result = await notificationService.generateEmailContent({
        organizationId: 'org-1',
        recipientId: 'user-1',
        recipientEmail: 'test@example.com',
        notificationType: 'warranty_expiring',
        metadata,
      });

      expect(result.subject).toContain('WARRANTY ALERT');
      expect(result.subject).toContain('Test Asset');
      expect(result.htmlBody).toContain('SN123');
      expect(result.textBody).toContain('Test Client');
    });
  });

  describe('processPendingNotifications', () => {
    it('should process pending notifications successfully', async () => {
      const mockPendingNotifications = [
        {
          id: 'notif-1',
          recipientEmail: 'test1@example.com',
          subject: 'Test Subject 1',
          textBody: 'Test Body 1',
          htmlBody: '<p>Test Body 1</p>',
        },
        {
          id: 'notif-2',
          recipientEmail: 'test2@example.com',
          subject: 'Test Subject 2',
          textBody: 'Test Body 2',
          htmlBody: '<p>Test Body 2</p>',
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockPendingNotifications),
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      // @ts-ignore
      db.select = mockSelect;
      // @ts-ignore
      db.update = mockUpdate;

      const result = await notificationService.processPendingNotifications();

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });

    it('should handle failed email sends', async () => {
      const mockPendingNotifications = [
        {
          id: 'notif-1',
          recipientEmail: 'invalid-email',
          subject: 'Test Subject',
          textBody: 'Test Body',
          htmlBody: '<p>Test Body</p>',
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockPendingNotifications),
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      // @ts-ignore
      db.select = mockSelect;
      // @ts-ignore
      db.update = mockUpdate;

      // Mock email sending failure
      const mockTransporter = {
        sendMail: vi.fn().mockRejectedValue(new Error('Invalid email address')),
      };
      // @ts-ignore
      notificationService.transporter = mockTransporter;

      const result = await notificationService.processPendingNotifications();

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'Invalid email address',
        })
      );
    });
  });

  describe('checkSlaBreaches', () => {
    it('should queue notifications for SLA breaches', async () => {
      const mockActiveAlerts = [
        {
          alert: {
            id: 'alert-1',
            alertType: 'breach',
            deadlineAt: new Date(Date.now() - 1000), // Past deadline
            message: 'SLA breach detected',
          },
          ticket: {
            id: 'ticket-1',
            number: 'TEST-001',
            title: 'Test Ticket',
            organizationId: 'org-1',
          },
          client: {
            name: 'Test Client',
          },
          assignee: {
            id: 'user-1',
            email: 'assignee@example.com',
          },
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockActiveAlerts),
              }),
            }),
          }),
        }),
      });

      // @ts-ignore
      db.select = mockSelect;

      // Mock queueEmailNotification
      const queueSpy = vi.spyOn(notificationService, 'queueEmailNotification').mockResolvedValue('test-id');

      await notificationService.checkSlaBreaches();

      expect(queueSpy).toHaveBeenCalledWith({
        organizationId: 'org-1',
        recipientId: 'user-1',
        recipientEmail: 'assignee@example.com',
        notificationType: 'sla_breach',
        relatedTicketId: 'ticket-1',
        relatedSlaAlertId: 'alert-1',
        metadata: expect.objectContaining({
          ticketNumber: 'TEST-001',
          ticketTitle: 'Test Ticket',
          clientName: 'Test Client',
        }),
      });
    });
  });

  describe('email template generation', () => {
    beforeEach(() => {
      // Mock environment variable for testing
      process.env.APP_URL = 'https://test.helixpsa.com';
    });

    it('should generate HTML template for SLA breach', () => {
      const metadata = {
        ticketNumber: 'TEST-001',
        ticketTitle: 'Critical Issue',
        clientName: 'ACME Corp',
        deadline: new Date('2024-01-01T12:00:00Z'),
        ticketId: 'ticket-123',
      };

      // @ts-ignore
      const html = notificationService.generateSlaBreachHtml(metadata);

      expect(html).toContain('SLA BREACH ALERT');
      expect(html).toContain('TEST-001');
      expect(html).toContain('Critical Issue');
      expect(html).toContain('ACME Corp');
      expect(html).toContain('href="https://test.helixpsa.com/tickets/ticket-123"');
    });

    it('should generate text template for warranty expiring', () => {
      const metadata = {
        assetName: 'Dell Server',
        serialNumber: 'DSV123',
        clientName: 'Tech Corp',
        warrantyExpiry: new Date('2024-06-01'),
      };

      // @ts-ignore
      const text = notificationService.generateWarrantyExpiringText(metadata);

      expect(text).toContain('WARRANTY EXPIRING');
      expect(text).toContain('Dell Server');
      expect(text).toContain('DSV123');
      expect(text).toContain('Tech Corp');
      expect(text).toContain('6/1/2024');
    });
  });
});