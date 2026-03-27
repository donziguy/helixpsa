import { AutomationService } from './AutomationService'
import type { Database } from '@/db'
import { vi, describe, beforeEach, it, expect } from 'vitest'

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(), 
  update: vi.fn(),
} as unknown as Database

describe('AutomationService', () => {
  let service: AutomationService

  beforeEach(() => {
    service = new AutomationService(mockDb)
    vi.clearAllMocks()
  })

  describe('executeRulesForTicket', () => {
    it('should return empty results when no ticket found', async () => {
      // Mock database to return no ticket - where() returns a promise so .then(rows => rows[0]) works
      ;(mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]), // Empty array, .then(rows => rows[0]) = undefined
            }),
          }),
        }),
      })

      const result = await service.executeRulesForTicket('ticket-1', 'org-1', 'created')

      expect(result.rulesExecuted).toBe(0)
      expect(result.errors).toContain('Ticket ticket-1 not found')
    })

    it('should execute applicable rules for a ticket', async () => {
      // Mock ticket data
      const mockTicketData = {
        ticket: {
          id: 'ticket-1',
          title: 'VIP Client Issue',
          status: 'open',
          priority: 'high',
          clientId: 'client-1',
          assigneeId: null,
          organizationId: 'org-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        client: {
          id: 'client-1',
          name: 'VIP Corp',
          organizationId: 'org-1',
        },
        assignee: null,
      }

      // Mock rules
      const mockRules = [{
        id: 'rule-1',
        organizationId: 'org-1',
        name: 'Auto-assign VIP clients',
        ruleType: 'auto_assign',
        isActive: true,
        priority: 1,
        conditions: JSON.stringify([{
          type: 'client_match',
          operator: 'contains',
          value: 'VIP',
        }]),
        actions: JSON.stringify([{
          type: 'assign_user',
          value: 'user-1',
        }]),
        createdBy: 'user-1',
        lastTriggered: null,
        triggerCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]

      // First select: get ticket data. where() returns promise, .then(rows => rows[0]) resolves to mockTicketData
      // Second select: get rules. orderBy() resolves to mockRules array
      ;(mockDb.select as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockTicketData]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockRules),
            }),
          }),
        })

      // update mock for rule actions + rule stats update
      ;(mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      // insert mock for logging
      ;(mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          catch: vi.fn().mockResolvedValue(undefined),
        }),
      })

      const result = await service.executeRulesForTicket('ticket-1', 'org-1', 'created')

      expect(result.rulesExecuted).toBe(1)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('executeAutoCloseRules', () => {
    it('should close tickets that meet auto-close criteria', async () => {
      const mockAutoCloseRules = [{
        id: 'rule-1',
        organizationId: 'org-1', 
        name: 'Auto-close resolved tickets',
        ruleType: 'auto_close',
        isActive: true,
        priority: 1,
        conditions: JSON.stringify([
          {
            type: 'status_match',
            operator: 'equals',
            value: 'resolved',
          },
          {
            type: 'time_elapsed',
            operator: 'greater_than',
            value: 7,
          },
        ]),
        actions: JSON.stringify([{
          type: 'change_status',
          value: 'closed',
        }]),
        createdBy: 'user-1',
        lastTriggered: null,
        triggerCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]

      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 10) // 10 days ago

      const mockEligibleTickets = [{
        ticket: {
          id: 'ticket-1',
          title: 'Old resolved ticket',
          status: 'resolved',
          priority: 'medium',
          resolvedAt: oldDate,
          closedAt: null,
          organizationId: 'org-1',
        },
        client: {
          id: 'client-1',
          name: 'Test Client',
        },
      }]

      // First select: get auto-close rules
      // Second select: get eligible tickets
      ;(mockDb.select as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockAutoCloseRules),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockEligibleTickets),
            }),
          }),
        })

      ;(mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      })

      ;(mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          catch: vi.fn().mockResolvedValue(undefined),
        }),
      })

      const result = await service.executeAutoCloseRules('org-1')

      expect(result.ticketsClosed).toBe(1)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle errors gracefully', async () => {
      // Mock rules that will throw an error
      const mockRules = [{
        id: 'rule-1',
        organizationId: 'org-1',
        name: 'Broken rule',
        ruleType: 'auto_close',
        conditions: 'invalid json', // This will cause a JSON.parse error
        actions: '[]',
      }]

      ;(mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockRules),
        }),
      })

      ;(mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          catch: vi.fn().mockResolvedValue(undefined),
        }),
      })

      const result = await service.executeAutoCloseRules('org-1')

      // JSON.parse will throw on invalid JSON, caught in error handler
      expect(result.ticketsClosed).toBe(0)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Broken rule')
    })
  })
})
