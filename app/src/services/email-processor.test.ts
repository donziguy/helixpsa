import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailProcessor, processEmailsManually } from './email-processor';
import { db } from '../db';
import { emailConfigurations, emailProcessingLogs, tickets, clients } from '../db/schema';

// Mock dependencies
vi.mock('imap', () => {
  const mockImap = vi.fn(() => ({
    once: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
    openBox: vi.fn(),
    search: vi.fn(),
    fetch: vi.fn(),
  }));
  return { default: mockImap };
});

vi.mock('mailparser', () => ({
  simpleParser: vi.fn(),
}));

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'mocked-hash'),
    })),
    createCipher: vi.fn(),
    createDecipher: vi.fn(),
  };
});

vi.mock('~/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock crypto for password decryption
vi.mock('crypto', () => ({
  createDecipher: vi.fn(() => ({
    update: vi.fn(() => 'decrypted'),
    final: vi.fn(() => 'password'),
  })),
}));

const mockDb = vi.mocked(db);

describe('EmailProcessor', () => {
  let emailProcessor: EmailProcessor;

  beforeEach(() => {
    emailProcessor = new EmailProcessor();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('processAllConfigurations', () => {
    it('should process all active configurations', async () => {
      const mockConfigurations = [
        {
          id: 'config-1',
          name: 'Config 1',
          email: 'test1@test.com',
          password: 'encrypted-password',
          isActive: true,
          organizationId: 'org-1',
          imapHost: 'imap.gmail.com',
          imapPort: 993,
          imapSecure: true,
          folderName: 'INBOX',
          lastProcessedUid: 0,
          defaultClientId: 'client-1',
          defaultAssigneeId: 'user-1',
          defaultPriority: 'medium',
        },
        {
          id: 'config-2',
          name: 'Config 2',
          email: 'test2@test.com',
          password: 'encrypted-password',
          isActive: true,
          organizationId: 'org-1',
          imapHost: 'imap.gmail.com',
          imapPort: 993,
          imapSecure: true,
          folderName: 'INBOX',
          lastProcessedUid: 100,
          defaultClientId: 'client-1',
          defaultAssigneeId: 'user-1',
          defaultPriority: 'high',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockConfigurations),
        }),
      });

      // Mock processConfiguration to avoid IMAP connection
      const processConfigSpy = vi.spyOn(emailProcessor, 'processConfiguration').mockResolvedValue();

      await emailProcessor.processAllConfigurations();

      expect(processConfigSpy).toHaveBeenCalledTimes(2);
      expect(processConfigSpy).toHaveBeenCalledWith(mockConfigurations[0]);
      expect(processConfigSpy).toHaveBeenCalledWith(mockConfigurations[1]);
    });

    it('should handle errors gracefully and continue processing other configurations', async () => {
      const mockConfigurations = [
        {
          id: 'config-1',
          name: 'Config 1',
          organizationId: 'org-1',
        },
        {
          id: 'config-2',
          name: 'Config 2',
          organizationId: 'org-1',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockConfigurations),
        }),
      });

      const processConfigSpy = vi.spyOn(emailProcessor, 'processConfiguration')
        .mockRejectedValueOnce(new Error('IMAP connection failed'))
        .mockResolvedValueOnce();

      // Mock logProcessingError
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      });

      await emailProcessor.processAllConfigurations();

      expect(processConfigSpy).toHaveBeenCalledTimes(2);
      expect(mockDb.insert).toHaveBeenCalledWith(emailProcessingLogs);
    });
  });

  describe('generateTicketNumber', () => {
    it('should generate correct ticket number format', async () => {
      const organizationId = 'org-1';
      
      // Mock the ticket count query
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const ticketNumber = await (emailProcessor as any).generateTicketNumber(organizationId);

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const expectedNumber = `${year}${month}-0006-EMAIL`; // count + 1

      expect(ticketNumber).toBe(expectedNumber);
    });

    it('should handle first ticket of the day', async () => {
      const organizationId = 'org-1';
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const ticketNumber = await (emailProcessor as any).generateTicketNumber(organizationId);

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const expectedNumber = `${year}${month}-0001-EMAIL`;

      expect(ticketNumber).toBe(expectedNumber);
    });
  });

  describe('cleanSubject', () => {
    it('should remove Re: and Fwd: prefixes', () => {
      const cleanSubject = (emailProcessor as any).cleanSubject;

      expect(cleanSubject('Re: Test Subject')).toBe('Test Subject');
      expect(cleanSubject('Fwd: Important Message')).toBe('Important Message');
      expect(cleanSubject('FW: Another Message')).toBe('Another Message');
      expect(cleanSubject('re: lowercase prefix')).toBe('lowercase prefix');
      expect(cleanSubject('Normal Subject')).toBe('Normal Subject');
    });

    it('should truncate long subjects', () => {
      const cleanSubject = (emailProcessor as any).cleanSubject;
      const longSubject = 'A'.repeat(500);
      const result = cleanSubject(longSubject);
      
      expect(result.length).toBe(450);
      expect(result).toBe('A'.repeat(450));
    });
  });

  describe('formatEmailDescription', () => {
    it('should format email description correctly', () => {
      const formatEmailDescription = (emailProcessor as any).formatEmailDescription;
      const email = {
        from: 'test@test.com',
        date: new Date('2024-03-22T10:00:00Z'),
        messageId: '<test123@test.com>',
        text: 'This is the email content.',
      };

      const description = formatEmailDescription(email);

      expect(description).toContain('**Email Details:**');
      expect(description).toContain('From: test@test.com');
      expect(description).toContain('Date: 2024-03-22T10:00:00.000Z');
      expect(description).toContain('Message ID: <test123@test.com>');
      expect(description).toContain('**Content:**');
      expect(description).toContain('This is the email content.');
    });

    it('should handle missing text content', () => {
      const formatEmailDescription = (emailProcessor as any).formatEmailDescription;
      const email = {
        from: 'test@test.com',
        date: new Date(),
        messageId: '<test@test.com>',
        text: '',
      };

      const description = formatEmailDescription(email);
      expect(description).toContain('No text content available');
    });
  });

  describe('determineClient', () => {
    it('should use default client when no mappings match', async () => {
      const determineClient = (emailProcessor as any).determineClient;
      const email = {
        from: 'unknown@unknown.com',
        subject: 'Random subject',
      };
      const config = {
        organizationId: 'org-1',
        autoAssignBySubject: false,
        subjectClientMappings: null,
        defaultClientId: 'default-client-1',
      };

      const result = await determineClient(email, config);
      expect(result).toBe('default-client-1');
    });

    it('should find client by subject mapping', async () => {
      const determineClient = (emailProcessor as any).determineClient;
      const email = {
        from: 'user@test.com',
        subject: 'Server issue with database',
      };
      const config = {
        organizationId: 'org-1',
        autoAssignBySubject: true,
        subjectClientMappings: '{"server": "server-client-1", "database": "db-client-1"}',
        defaultClientId: 'default-client-1',
      };

      const result = await determineClient(email, config);
      expect(result).toBe('server-client-1'); // First match wins
    });

    it('should fall back to first active client when no default is set', async () => {
      const determineClient = (emailProcessor as any).determineClient;
      const email = {
        from: 'user@test.com',
        subject: 'Some issue',
      };
      const config = {
        organizationId: 'org-1',
        autoAssignBySubject: false,
        subjectClientMappings: null,
        defaultClientId: null,
      };

      // Mock the client query
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: 'first-active-client' },
            ]),
          }),
        }),
      });

      const result = await determineClient(email, config);
      expect(result).toBe('first-active-client');
    });

    it('should throw error when no clients are found', async () => {
      const determineClient = (emailProcessor as any).determineClient;
      const email = {
        from: 'user@test.com',
        subject: 'Some issue',
      };
      const config = {
        organizationId: 'org-1',
        autoAssignBySubject: false,
        subjectClientMappings: null,
        defaultClientId: null,
      };

      // Mock empty client query
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(determineClient(email, config)).rejects.toThrow('No active clients found for this organization');
    });
  });
});

describe('processEmailsManually', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process specific configuration when ID provided', async () => {
    const configId = 'config-1';
    const mockConfig = {
      id: configId,
      name: 'Test Config',
      isActive: true,
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockConfig]),
        }),
      }),
    });

    const emailProcessor = new EmailProcessor();
    const processConfigSpy = vi.spyOn(emailProcessor, 'processConfiguration').mockResolvedValue();

    const result = await processEmailsManually(configId);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Email processing completed successfully');
  });

  it('should return error when configuration not found', async () => {
    const configId = 'non-existent';

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await processEmailsManually(configId);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Configuration not found');
  });

  it('should process all configurations when no ID provided', async () => {
    const emailProcessor = new EmailProcessor();
    const processAllSpy = vi.spyOn(emailProcessor, 'processAllConfigurations').mockResolvedValue();

    const result = await processEmailsManually();

    expect(result.success).toBe(true);
    expect(result.message).toBe('Email processing completed successfully');
  });

  it('should handle processing errors gracefully', async () => {
    const emailProcessor = new EmailProcessor();
    const processAllSpy = vi.spyOn(emailProcessor, 'processAllConfigurations')
      .mockRejectedValue(new Error('IMAP connection failed'));

    const result = await processEmailsManually();

    expect(result.success).toBe(false);
    expect(result.message).toBe('IMAP connection failed');
  });
});