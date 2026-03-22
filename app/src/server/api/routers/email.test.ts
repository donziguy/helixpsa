import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTRPCMsw } from 'msw-trpc';
import { db } from '../../../db';
import { emailConfigurations, emailProcessingLogs, organizations, users, clients } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { emailRouter } from './email';
import { createTRPCContext } from '../trpc';

// Mock the database
vi.mock('~/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock crypto for password encryption/decryption
vi.mock('crypto', () => ({
  createCipher: vi.fn(() => ({
    update: vi.fn(() => 'encrypted'),
    final: vi.fn(() => 'data'),
  })),
  createDecipher: vi.fn(() => ({
    update: vi.fn(() => 'decrypted'),
    final: vi.fn(() => 'password'),
  })),
  randomBytes: vi.fn(() => Buffer.from('1234567890123456')),
}));

const mockDb = vi.mocked(db);

// Mock session context
const createMockContext = (organizationId = 'org-1') => ({
  session: {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      organizationId,
    },
  },
  db: mockDb,
});

describe('emailRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getConfigurations', () => {
    it('should return email configurations for the organization', async () => {
      const mockConfigurations = [
        {
          id: 'config-1',
          name: 'Support Email',
          email: 'support@test.com',
          imapHost: 'imap.gmail.com',
          imapPort: 993,
          imapSecure: true,
          folderName: 'INBOX',
          defaultClientId: 'client-1',
          defaultAssigneeId: 'user-1',
          defaultPriority: 'medium',
          isActive: true,
          autoAssignBySubject: false,
          subjectClientMappings: null,
          lastProcessedUid: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockConfigurations),
            }),
          }),
        }),
      });

      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      const result = await caller.getConfigurations();
      
      expect(result).toEqual(mockConfigurations);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('createConfiguration', () => {
    it('should create a new email configuration', async () => {
      const newConfigData = {
        name: 'Test Config',
        imapHost: 'imap.test.com',
        imapPort: 993,
        imapSecure: true,
        email: 'test@test.com',
        password: 'password123',
        defaultClientId: 'client-1',
        defaultAssigneeId: 'user-1',
        defaultPriority: 'medium' as const,
        folderName: 'INBOX',
        autoAssignBySubject: false,
        subjectClientMappings: '',
      };

      const mockCreatedConfig = {
        id: 'new-config-1',
        organizationId: 'org-1',
        ...newConfigData,
        password: 'iv:encrypted', // Encrypted password
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCreatedConfig]),
        }),
      });

      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      const result = await caller.createConfiguration(newConfigData);
      
      expect(result).toEqual(mockCreatedConfig);
      expect(mockDb.insert).toHaveBeenCalledWith(emailConfigurations);
    });

    it('should validate required fields', async () => {
      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      await expect(caller.createConfiguration({
        name: '', // Empty name should fail
        imapHost: 'imap.test.com',
        imapPort: 993,
        imapSecure: true,
        email: 'test@test.com',
        password: 'password123',
        defaultPriority: 'medium',
        folderName: 'INBOX',
        autoAssignBySubject: false,
      })).rejects.toThrow();
    });
  });

  describe('updateConfiguration', () => {
    it('should update an existing email configuration', async () => {
      const updateData = {
        id: 'config-1',
        name: 'Updated Config',
        isActive: false,
      };

      const mockUpdatedConfig = {
        id: 'config-1',
        organizationId: 'org-1',
        name: 'Updated Config',
        isActive: false,
        updatedAt: new Date(),
      };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdatedConfig]),
          }),
        }),
      });

      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      const result = await caller.updateConfiguration(updateData);
      
      expect(result).toEqual(mockUpdatedConfig);
      expect(mockDb.update).toHaveBeenCalledWith(emailConfigurations);
    });

    it('should throw error when configuration not found', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      await expect(caller.updateConfiguration({
        id: 'non-existent',
        name: 'Test',
      })).rejects.toThrow('Email configuration not found');
    });
  });

  describe('deleteConfiguration', () => {
    it('should delete an email configuration', async () => {
      const mockDeletedConfig = {
        id: 'config-1',
        organizationId: 'org-1',
        name: 'Deleted Config',
      };

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDeletedConfig]),
        }),
      });

      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      const result = await caller.deleteConfiguration({ id: 'config-1' });
      
      expect(result).toEqual(mockDeletedConfig);
      expect(mockDb.delete).toHaveBeenCalledWith(emailConfigurations);
    });

    it('should throw error when configuration not found for deletion', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      await expect(caller.deleteConfiguration({ id: 'non-existent' })).rejects.toThrow('Email configuration not found');
    });
  });

  describe('testConfiguration', () => {
    it('should return success for valid configuration', async () => {
      const mockConfig = {
        id: 'config-1',
        organizationId: 'org-1',
        name: 'Test Config',
        password: 'encrypted-password',
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockConfig]),
          }),
        }),
      });

      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      const result = await caller.testConfiguration({ id: 'config-1' });
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Email configuration test successful');
    });

    it('should throw error when configuration not found for testing', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      await expect(caller.testConfiguration({ id: 'non-existent' })).rejects.toThrow('Email configuration not found');
    });
  });

  describe('getProcessingLogs', () => {
    it('should return processing logs for the organization', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          emailUid: 123,
          fromEmail: 'test@test.com',
          subject: 'Test Email',
          messageId: '<test@test.com>',
          status: 'processed',
          errorMessage: null,
          processedAt: new Date(),
          createdAt: new Date(),
          configuration: {
            id: 'config-1',
            name: 'Test Config',
            email: 'support@test.com',
          },
          ticket: {
            id: 'ticket-1',
            number: '202403-0001',
            title: 'Test Ticket',
            status: 'open',
          },
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(mockLogs),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      const result = await caller.getProcessingLogs({});
      
      expect(result).toEqual(mockLogs);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should filter logs by configuration ID when provided', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
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
        }),
      });

      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      await caller.getProcessingLogs({ configurationId: 'config-1' });
      
      // Should call the query with configuration filter
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return email processing statistics', async () => {
      const mockStats = [
        {
          totalConfigs: 'config-1',
          activeConfigs: true,
          totalLogs: 'log-1',
          successfulProcessed: 'processed',
          failedProcessed: 'failed',
        },
        {
          totalConfigs: 'config-1',
          activeConfigs: true,
          totalLogs: 'log-2',
          successfulProcessed: 'processed',
          failedProcessed: 'processed',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockStats),
          }),
        }),
      });

      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      const result = await caller.getStatistics();
      
      expect(result).toEqual({
        totalConfigurations: 2,
        activeConfigurations: 2,
        totalEmailsProcessed: 2,
        successfullyProcessed: 2,
        failed: 0,
      });
    });
  });

  describe('processEmails', () => {
    it('should return success message for email processing', async () => {
      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      const result = await caller.processEmails({});
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Email processing triggered');
    });

    it('should handle specific configuration processing', async () => {
      const ctx = createMockContext();
      const caller = emailRouter.createCaller(ctx);
      
      const result = await caller.processEmails({ configurationId: 'config-1' });
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Email processing triggered');
    });
  });
});