import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiRouter } from './ai';
import { createTRPCMsw } from 'msw-trpc';
import { type AppRouter } from '../root';

// Mock database context
const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        then: vi.fn(),
        groupBy: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve([])),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
        limit: vi.fn(() => Promise.resolve([])),
      })),
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          then: vi.fn(() => Promise.resolve([])),
          groupBy: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve([])),
          })),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
          limit: vi.fn(() => Promise.resolve([])),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
      groupBy: vi.fn(() => ({
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
      orderBy: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([])),
      })),
      limit: vi.fn(() => Promise.resolve([])),
      then: vi.fn(() => Promise.resolve([])),
    })),
  })),
};

const mockContext = {
  db: mockDb,
  organizationId: 'test-org-id',
  session: {
    user: {
      id: 'test-user-id',
      organizationId: 'test-org-id',
      email: 'test@example.com',
    }
  }
};

const mockCaller = aiRouter.createCaller(mockContext);

describe('AI Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('triageTicket', () => {
    it('should suggest critical priority for urgent issues', async () => {
      // Mock empty database responses for simplicity
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            then: vi.fn(() => Promise.resolve([])),
            groupBy: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              then: vi.fn(() => Promise.resolve([])),
            })),
          })),
          groupBy: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve([])),
          })),
        })),
      });

      const result = await mockCaller.triageTicket({
        title: 'URGENT: Server down, all users affected',
        description: 'The main server is completely down and no one can access their files or email',
        clientId: 'test-client-id'
      });

      expect(result.suggestions.priority).toBe('critical');
      expect(result.suggestions.category).toBe('Network/Connectivity');
      expect(result.confidence.priority).toBe(0.8);
      expect(result.suggestions.explanation).toContain('urgent language detected');
    });

    it('should suggest appropriate category for hardware issues', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            then: vi.fn(() => Promise.resolve([])),
            groupBy: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              then: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      });

      const result = await mockCaller.triageTicket({
        title: 'Laptop screen is broken',
        description: 'The laptop screen has a crack and half of it is not displaying properly'
      });

      expect(result.suggestions.category).toBe('Hardware Issue');
      expect(result.suggestions.priority).toBe('medium');
      expect(result.suggestions.estimatedHours).toBeGreaterThan(0);
    });

    it('should suggest medium priority for general questions', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            then: vi.fn(() => Promise.resolve([])),
            groupBy: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              then: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      });

      const result = await mockCaller.triageTicket({
        title: 'How to setup email on new phone?',
        description: 'I got a new iPhone and need help setting up my work email'
      });

      expect(result.suggestions.priority).toBe('medium');
      expect(result.suggestions.category).toBe('Email/Communication');
      expect(result.suggestions.explanation).toContain('standard support request');
    });

    it('should handle security-related tickets with high priority', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            then: vi.fn(() => Promise.resolve([])),
            groupBy: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              then: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      });

      const result = await mockCaller.triageTicket({
        title: 'Suspicious virus detected on computer',
        description: 'Antivirus is showing multiple threats and computer is running very slow'
      });

      expect(result.suggestions.category).toBe('Security');
      expect(result.suggestions.priority).toBe('high');
      expect(result.suggestions.estimatedHours).toBeGreaterThan(0);
    });

    it('should return assignee suggestions when users are available', async () => {
      // Mock user query to return available technicians
      mockDb.select.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            then: vi.fn(() => Promise.resolve([])), // No historical assignments
            groupBy: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      }).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            then: vi.fn(() => Promise.resolve([
              {
                id: 'tech-1',
                firstName: 'John',
                lastName: 'Doe',
                role: 'technician'
              },
              {
                id: 'tech-2',
                firstName: 'Jane',
                lastName: 'Smith',
                role: 'manager'
              }
            ])),
          })),
        })),
      }).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            then: vi.fn(() => Promise.resolve([])), // No current workload
            groupBy: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      }).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            then: vi.fn(() => Promise.resolve([
              {
                id: 'tech-1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                role: 'technician'
              }
            ])),
          })),
        })),
      }).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            then: vi.fn(() => Promise.resolve([])), // Historical time estimates
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      }).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            then: vi.fn(() => Promise.resolve(null)), // Client query
          })),
        })),
      });

      const result = await mockCaller.triageTicket({
        title: 'Need help with software installation',
        description: 'Can you help install Microsoft Office on my computer?'
      });

      expect(result.suggestions.assignee).toBeTruthy();
      expect(result.suggestions.assignee?.firstName).toBe('John');
      expect(result.confidence.assignee).toBeGreaterThan(0);
    });
  });

  describe('suggestTime', () => {
    it('should provide time estimates based on category', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            then: vi.fn(() => Promise.resolve([])),
            limit: vi.fn(() => Promise.resolve([])),
          })),
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              then: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      });

      const result = await mockCaller.suggestTime({
        title: 'Email configuration problem',
        description: 'Outlook is not syncing emails properly'
      });

      expect(result.estimatedHours).toBeGreaterThan(0);
      expect(result.category).toBe('Email/Communication');
      expect(result.confidence).toBe(0.7);
      expect(result.reasoning).toContain('historical data');
    });

    it('should handle complex tasks with higher time estimates', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            then: vi.fn(() => Promise.resolve([])),
            limit: vi.fn(() => Promise.resolve([])),
          })),
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              then: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      });

      const result = await mockCaller.suggestTime({
        title: 'Complex network integration setup',
        description: 'Need to integrate multiple systems with complex authentication'
      });

      expect(result.estimatedHours).toBeGreaterThan(1);
      expect(result.category).toBe('Network/Connectivity');
    });
  });

  describe('getInsights', () => {
    it('should identify unassigned critical tickets', async () => {
      const mockOpenTickets = [
        {
          id: 'ticket-1',
          title: 'Critical server issue',
          priority: 'critical',
          assigneeId: null,
          createdAt: new Date()
        },
        {
          id: 'ticket-2', 
          title: 'High priority problem',
          priority: 'high',
          assigneeId: null,
          createdAt: new Date()
        }
      ];

      mockDb.select.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(mockOpenTickets)),
            })),
          })),
        })),
      }).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            groupBy: vi.fn(() => Promise.resolve([
              { assigneeId: 'tech-1', openTickets: 5 },
              { assigneeId: 'tech-2', openTickets: 3 }
            ])),
          })),
        })),
      });

      const result = await mockCaller.getInsights();

      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          title: 'Unassigned High Priority Tickets',
          description: expect.stringContaining('2 critical/high priority tickets')
        })
      );
      expect(result.stats.unassignedTickets).toBe(2);
      expect(result.stats.highPriorityTickets).toBe(2);
    });

    it('should detect workload imbalance', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      }).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            groupBy: vi.fn(() => Promise.resolve([
              { assigneeId: 'tech-1', openTickets: 10 },
              { assigneeId: 'tech-2', openTickets: 2 },
              { assigneeId: 'tech-3', openTickets: 3 }
            ])),
          })),
        })),
      });

      const result = await mockCaller.getInsights();

      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          title: 'Workload Imbalance',
          description: expect.stringContaining('significantly more tickets')
        })
      );
      expect(result.stats.avgWorkload).toBe(5); // (10+2+3)/3 = 5
    });

    it('should provide summary statistics', async () => {
      const mockOpenTickets = [
        { id: '1', title: 'Test', priority: 'medium', assigneeId: 'tech-1', createdAt: new Date() },
        { id: '2', title: 'Test', priority: 'critical', assigneeId: null, createdAt: new Date() },
        { id: '3', title: 'Test', priority: 'low', assigneeId: 'tech-2', createdAt: new Date() }
      ];

      mockDb.select.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(mockOpenTickets)),
            })),
          })),
        })),
      }).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            groupBy: vi.fn(() => Promise.resolve([
              { assigneeId: 'tech-1', openTickets: 5 },
              { assigneeId: 'tech-2', openTickets: 4 }
            ])),
          })),
        })),
      });

      const result = await mockCaller.getInsights();

      expect(result.stats.totalOpenTickets).toBe(3);
      expect(result.stats.unassignedTickets).toBe(1);
      expect(result.stats.highPriorityTickets).toBe(1);
      expect(result.stats.avgWorkload).toBe(4.5);
    });
  });
});