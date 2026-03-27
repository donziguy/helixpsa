import { describe, it, expect, beforeEach, vi } from 'vitest';
import { slackRouter } from './slack';
import { createTRPCMsw } from 'msw-trpc';
import { type AppRouter } from '../root';
import { db } from '../../../db';

// Mock dependencies
vi.mock('../../../db');
vi.mock('../../../services/slack-service', () => ({
  slackService: {
    addSlackIntegration: vi.fn(),
    testSlackIntegration: vi.fn(),
    getSlackChannels: vi.fn(),
    processPendingNotifications: vi.fn(),
    queueSlackNotification: vi.fn(),
    disableSlackIntegration: vi.fn(),
  },
}));

vi.mock('@slack/web-api', () => ({
  WebClient: class MockWebClient {
    auth = {
      test: vi.fn().mockResolvedValue({ ok: true }),
    }
  },
}));

const mockSession = {
  user: {
    id: 'user-1',
    organizationId: 'org-1',
    email: 'test@example.com',
  },
  expires: '2026-12-31',
};

const mockContext = {
  session: mockSession,
  db: db as any,
};

describe('slackRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getIntegration', () => {
    it('should return integration if exists', async () => {
      const mockIntegration = {
        id: 'integration-1',
        teamId: 'T1234567890',
        teamName: 'Test Workspace',
        botUserId: 'U1234567890',
        isActive: true,
        createdAt: new Date('2026-03-26'),
        updatedAt: new Date('2026-03-26'),
      };

      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockIntegration]),
          }),
        }),
      });

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.getIntegration();

      expect(result).toEqual(mockIntegration);
    });

    it('should return null if no integration exists', async () => {
      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.getIntegration();

      expect(result).toBeNull();
    });
  });

  describe('addIntegration', () => {
    it('should add integration successfully', async () => {
      const { slackService } = await import('../../../services/slack-service');
      (slackService.addSlackIntegration as any).mockResolvedValue('integration-id-1');

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.addIntegration({
        teamId: 'T1234567890',
        teamName: 'Test Workspace',
        botUserId: 'U1234567890',
        botAccessToken: 'xoxb-test-token',
      });

      expect(result).toEqual({
        success: true,
        integrationId: 'integration-id-1',
      });

      expect(slackService.addSlackIntegration).toHaveBeenCalledWith({
        organizationId: 'org-1',
        teamId: 'T1234567890',
        teamName: 'Test Workspace',
        botUserId: 'U1234567890',
        botAccessToken: 'xoxb-test-token',
      });
    });

    it('should throw error with invalid token', async () => {
      // Mock invalid token response by mocking the module again
      vi.doMock('@slack/web-api', () => ({
        WebClient: class MockWebClient {
          auth = {
            test: vi.fn().mockResolvedValue({ ok: false }),
          }
        },
      }));

      const caller = slackRouter.createCaller(mockContext);

      await expect(caller.addIntegration({
        teamId: 'T1234567890',
        teamName: 'Test Workspace',
        botUserId: 'U1234567890',
        botAccessToken: 'invalid-token',
      })).rejects.toThrow('Invalid Slack bot token');
    });
  });

  describe('testIntegration', () => {
    it('should return success when integration is working', async () => {
      const { slackService } = await import('../../../services/slack-service');
      (slackService.testSlackIntegration as any).mockResolvedValue(true);

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.testIntegration();

      expect(result).toEqual({
        success: true,
        message: 'Slack integration is working',
      });

      expect(slackService.testSlackIntegration).toHaveBeenCalledWith('org-1');
    });

    it('should return failure when integration is not working', async () => {
      const { slackService } = await import('../../../services/slack-service');
      (slackService.testSlackIntegration as any).mockResolvedValue(false);

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.testIntegration();

      expect(result).toEqual({
        success: false,
        message: 'Slack integration test failed',
      });
    });
  });

  describe('getChannels', () => {
    it('should return Slack channels', async () => {
      const mockChannels = [
        { id: 'C1234567890', name: 'general', is_member: true },
        { id: 'C1234567891', name: 'alerts', is_member: false },
      ];

      const { slackService } = await import('../../../services/slack-service');
      (slackService.getSlackChannels as any).mockResolvedValue(mockChannels);

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.getChannels();

      expect(result).toEqual(mockChannels);
      expect(slackService.getSlackChannels).toHaveBeenCalledWith('org-1');
    });
  });

  describe('getNotificationPreferences', () => {
    it('should return notification preferences with defaults', async () => {
      const mockPreferences = [
        {
          id: 'pref-1',
          organizationId: 'org-1',
          userId: 'user-1',
          notificationType: 'sla_breach',
          channel: 'slack',
          isEnabled: true,
          settings: JSON.stringify({
            slackChannelId: 'C1234567890',
            slackChannelName: 'alerts',
            useDirectMessage: false,
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockPreferences),
        }),
      });

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.getNotificationPreferences();

      expect(result).toHaveLength(7); // All notification types
      expect(result[0]).toEqual({
        notificationType: 'sla_breach',
        channel: 'slack',
        isEnabled: true,
        settings: {
          slackChannelId: 'C1234567890',
          slackChannelName: 'alerts',
          useDirectMessage: false,
        },
        id: 'pref-1',
      });

      // Check defaults for non-existing preferences
      expect(result[1].isEnabled).toBe(false); // Default disabled for Slack
      expect(result[1].settings).toEqual({
        slackChannelId: null,
        slackChannelName: null,
        useDirectMessage: true,
      });
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update existing preferences', async () => {
      // Mock existing preference
      const mockExisting = [
        {
          id: 'pref-1',
          organizationId: 'org-1',
          userId: 'user-1',
          notificationType: 'sla_breach',
          channel: 'slack',
          isEnabled: false,
          settings: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockExisting),
          }),
        }),
      });

      (db.update as any) = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      });

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.updateNotificationPreferences([
        {
          notificationType: 'sla_breach',
          isEnabled: true,
          settings: {
            slackChannelId: 'C1234567890',
            slackChannelName: 'alerts',
            useDirectMessage: false,
          },
        },
      ]);

      expect(result).toEqual({ success: true });
      expect(db.update).toHaveBeenCalled();
    });

    it('should create new preferences when none exist', async () => {
      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No existing preference
          }),
        }),
      });

      (db.insert as any) = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.updateNotificationPreferences([
        {
          notificationType: 'ticket_assigned',
          isEnabled: true,
          settings: {
            useDirectMessage: true,
          },
        },
      ]);

      expect(result).toEqual({ success: true });
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('getNotificationHistory', () => {
    it('should return notification history', async () => {
      const mockHistory = [
        {
          id: 'notif-1',
          notificationType: 'sla_breach',
          slackChannelName: 'alerts',
          message: 'SLA breach notification',
          status: 'sent',
          errorMessage: null,
          sentAt: new Date('2026-03-26T12:00:00Z'),
          createdAt: new Date('2026-03-26T11:55:00Z'),
          recipient: {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        },
      ];

      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockHistory),
                }),
              }),
            }),
          }),
        }),
      });

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.getNotificationHistory({});

      expect(result).toEqual(mockHistory);
    });

    it('should apply filters correctly', async () => {
      (db.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const caller = slackRouter.createCaller(mockContext);
      await caller.getNotificationHistory({
        status: 'failed',
        notificationType: 'sla_breach',
        limit: 10,
        offset: 0,
      });

      // Verify that filters were applied (we'd need to check the actual query building in a real implementation)
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe('sendTestNotification', () => {
    it('should send test notification successfully', async () => {
      const { slackService } = await import('../../../services/slack-service');
      (slackService.queueSlackNotification as any).mockResolvedValue('notification-id-1');
      (slackService.processPendingNotifications as any).mockResolvedValue({
        sent: 1,
        failed: 0,
      });

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.sendTestNotification({
        notificationType: 'system_alert',
        slackChannelId: 'C1234567890',
        slackChannelName: 'alerts',
      });

      expect(result).toEqual({
        success: true,
        message: 'Test Slack notification sent successfully',
        notificationId: 'notification-id-1',
      });

      expect(slackService.queueSlackNotification).toHaveBeenCalledWith({
        organizationId: 'org-1',
        recipientId: 'user-1',
        slackChannelId: 'C1234567890',
        slackChannelName: 'alerts',
        notificationType: 'system_alert',
        metadata: expect.objectContaining({
          ticketNumber: 'TEST-001',
          ticketTitle: 'Test Slack Notification',
        }),
      });

      expect(slackService.processPendingNotifications).toHaveBeenCalled();
    });
  });

  describe('processPending', () => {
    it('should process pending notifications', async () => {
      const { slackService } = await import('../../../services/slack-service');
      (slackService.processPendingNotifications as any).mockResolvedValue({
        sent: 5,
        failed: 1,
      });

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.processPending();

      expect(result).toEqual({
        success: true,
        message: 'Processed 6 Slack notifications',
        sent: 5,
        failed: 1,
      });

      expect(slackService.processPendingNotifications).toHaveBeenCalled();
    });
  });

  describe('disableIntegration', () => {
    it('should disable integration successfully', async () => {
      const { slackService } = await import('../../../services/slack-service');
      (slackService.disableSlackIntegration as any).mockResolvedValue(undefined);

      const caller = slackRouter.createCaller(mockContext);
      const result = await caller.disableIntegration();

      expect(result).toEqual({
        success: true,
        message: 'Slack integration disabled successfully',
      });

      expect(slackService.disableSlackIntegration).toHaveBeenCalledWith('org-1');
    });
  });
});