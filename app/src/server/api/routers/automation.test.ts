import { vi, describe, beforeEach, it, expect, test } from 'vitest'
import { automationRouter } from './automation'
import { automationRules, automationRuleExecutions, users } from '@/db/schema'

// Use valid UUIDs for all test IDs
const RULE_ID = '00000000-0000-4000-8000-000000000001'
const RULE_ID_2 = '00000000-0000-4000-8000-000000000002'
const USER_ID = '00000000-0000-4000-8000-000000000010'
const ORG_ID = '00000000-0000-4000-8000-000000000020'
const TICKET_ID = '00000000-0000-4000-8000-000000000030'
const NONEXISTENT_ID = '00000000-0000-4000-8000-ffffffffffff'

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

// tRPC context needs session.user with organizationId/id, and db
const mockContext = {
  db: mockDb as any,
  session: {
    user: {
      id: USER_ID,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      organizationId: ORG_ID,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
  organizationId: ORG_ID,
  userId: USER_ID,
} as any

describe('automationRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock implementations
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
            then: vi.fn().mockResolvedValue([]),
            groupBy: vi.fn().mockReturnValue([]),
            limit: vi.fn().mockReturnValue([]),
          }),
        }),
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue([]),
          then: vi.fn().mockResolvedValue([]),
          groupBy: vi.fn().mockReturnValue([]),
          limit: vi.fn().mockReturnValue([]),
        }),
        orderBy: vi.fn().mockReturnValue([]),
        then: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockReturnValue([]),
        limit: vi.fn().mockReturnValue([]),
      }),
    })

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: RULE_ID,
          name: 'Test Rule',
          organizationId: ORG_ID,
          ruleType: 'auto_assign',
          conditions: '[]',
          actions: '[]',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      }),
    })

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: RULE_ID,
            name: 'Updated Rule',
            conditions: '[{"type":"client_match","operator":"equals","value":"test"}]',
            actions: '[{"type":"assign_user","value":"user-1"}]',
          }]),
        }),
      }),
    })

    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue({}),
    })
  })

  describe('getAll', () => {
    test('returns all automation rules for organization', async () => {
      const mockRules = [
        {
          id: RULE_ID,
          name: 'Auto-assign VIP',
          description: 'Assign VIP clients',
          ruleType: 'auto_assign',
          priority: 1,
          conditions: '[{"type":"client_match","operator":"contains","value":"VIP"}]',
          actions: '[{"type":"assign_user","value":"user-1"}]',
          isActive: true,
          lastTriggered: new Date(),
          triggerCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: USER_ID,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockRules),
            }),
          }),
        }),
      })

      const caller = automationRouter.createCaller(mockContext)
      const result = await caller.getAll()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Auto-assign VIP')
      expect(result[0].conditions).toEqual([{
        type: 'client_match',
        operator: 'contains',
        value: 'VIP',
      }])
      expect(result[0].actions).toEqual([{
        type: 'assign_user',
        value: 'user-1',
      }])
    })

    test('filters by organization ID', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      })

      const caller = automationRouter.createCaller(mockContext)
      await caller.getAll()

      expect(mockDb.select).toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    test('returns specific automation rule', async () => {
      const mockRule = {
        id: RULE_ID,
        name: 'Test Rule',
        description: 'Test description',
        ruleType: 'auto_assign',
        priority: 1,
        conditions: '[{"type":"client_match","operator":"equals","value":"test"}]',
        actions: '[{"type":"assign_user","value":"user-1"}]',
        isActive: true,
        lastTriggered: null,
        triggerCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: USER_ID,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      }

      // .where() must return a real Promise so .then(rows => rows[0]) works
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockRule]),
          }),
        }),
      })

      const caller = automationRouter.createCaller(mockContext)
      const result = await caller.getById({ id: RULE_ID })

      expect(result.id).toBe(RULE_ID)
      expect(result.name).toBe('Test Rule')
      expect(result.conditions).toHaveLength(1)
      expect(result.actions).toHaveLength(1)
    })

    test('throws error when rule not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const caller = automationRouter.createCaller(mockContext)
      
      await expect(caller.getById({ id: NONEXISTENT_ID })).rejects.toThrow(
        'Automation rule not found'
      )
    })
  })

  describe('create', () => {
    test('creates new automation rule', async () => {
      const input = {
        name: 'New Rule',
        description: 'Test rule',
        ruleType: 'auto_assign' as const,
        priority: 1,
        conditions: [{
          type: 'client_match' as const,
          operator: 'equals' as const,
          value: 'VIP',
        }],
        actions: [{
          type: 'assign_user' as const,
          value: 'user-1',
        }],
      }

      const caller = automationRouter.createCaller(mockContext)
      const result = await caller.create(input)

      expect(mockDb.insert).toHaveBeenCalledWith(automationRules)
      expect(result.name).toBe('Test Rule') // From mock return
    })

    test('validates auto-close rules require time condition', async () => {
      const input = {
        name: 'Invalid Auto-Close',
        ruleType: 'auto_close' as const,
        priority: 1,
        conditions: [{
          type: 'status_match' as const,
          operator: 'equals' as const,
          value: 'resolved',
        }],
        actions: [{
          type: 'change_status' as const,
          value: 'closed',
        }],
      }

      const caller = automationRouter.createCaller(mockContext)
      
      await expect(caller.create(input)).rejects.toThrow(
        'Auto-close rules must include a time_elapsed condition'
      )
    })

    test('validates auto-close rules require close status action', async () => {
      const input = {
        name: 'Invalid Auto-Close',
        ruleType: 'auto_close' as const,
        priority: 1,
        conditions: [{
          type: 'time_elapsed' as const,
          operator: 'greater_than' as const,
          value: 7,
        }],
        actions: [{
          type: 'assign_user' as const,
          value: 'user-1',
        }],
      }

      const caller = automationRouter.createCaller(mockContext)
      
      await expect(caller.create(input)).rejects.toThrow(
        'Auto-close rules must include a change_status action to "closed"'
      )
    })

    test('validates auto-assign rules require assign action', async () => {
      const input = {
        name: 'Invalid Auto-Assign',
        ruleType: 'auto_assign' as const,
        priority: 1,
        conditions: [{
          type: 'client_match' as const,
          operator: 'equals' as const,
          value: 'VIP',
        }],
        actions: [{
          type: 'change_status' as const,
          value: 'in_progress',
        }],
      }

      const caller = automationRouter.createCaller(mockContext)
      
      await expect(caller.create(input)).rejects.toThrow(
        'Auto-assign rules must include an assign_user action'
      )
    })
  })

  describe('update', () => {
    test('updates existing automation rule', async () => {
      // Mock existing rule - where() returns Promise so .then(rows => rows[0]) works
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: RULE_ID,
            name: 'Old Rule',
            organizationId: ORG_ID,
          }]),
        }),
      })

      const input = {
        id: RULE_ID,
        name: 'Updated Rule',
        isActive: false,
      }

      const caller = automationRouter.createCaller(mockContext)
      const result = await caller.update(input)

      expect(mockDb.update).toHaveBeenCalledWith(automationRules)
      expect(result.name).toBe('Updated Rule')
    })

    test('throws error when rule not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const caller = automationRouter.createCaller(mockContext)
      
      await expect(caller.update({ id: NONEXISTENT_ID })).rejects.toThrow(
        'Automation rule not found'
      )
    })
  })

  describe('delete', () => {
    test('deletes existing automation rule', async () => {
      // Mock existing rule
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: RULE_ID,
            organizationId: ORG_ID,
          }]),
        }),
      })

      const caller = automationRouter.createCaller(mockContext)
      const result = await caller.delete({ id: RULE_ID })

      expect(mockDb.delete).toHaveBeenCalledWith(automationRules)
      expect(result.success).toBe(true)
    })

    test('throws error when rule not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const caller = automationRouter.createCaller(mockContext)
      
      await expect(caller.delete({ id: NONEXISTENT_ID })).rejects.toThrow(
        'Automation rule not found'
      )
    })
  })

  describe('getExecutions', () => {
    test('returns execution history', async () => {
      const mockExecutions = [
        {
          id: 'exec-1',
          ruleId: RULE_ID,
          ticketId: TICKET_ID,
          status: 'success',
          executionData: '{"trigger":"created"}',
          errorMessage: null,
          executedAt: new Date(),
          rule: {
            name: 'Test Rule',
            ruleType: 'auto_assign',
          },
        },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockExecutions),
              }),
            }),
          }),
        }),
      })

      const caller = automationRouter.createCaller(mockContext)
      const result = await caller.getExecutions({ limit: 10 })

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('success')
      expect(result[0].executionData).toEqual({ trigger: 'created' })
    })

    test('filters by rule ID when provided', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      })

      const caller = automationRouter.createCaller(mockContext)
      await caller.getExecutions({ ruleId: RULE_ID, limit: 10 })

      expect(mockDb.select).toHaveBeenCalled()
    })
  })

  describe('getStats', () => {
    test('returns automation statistics', async () => {
      // getStats calls .select().from().where().then(rows => rows[0]?.count || 0)  four times
      let callCount = 0
      mockDb.select.mockImplementation(() => {
        callCount++
        const currentCall = callCount
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { count: currentCall === 1 ? 5 : currentCall === 2 ? 4 : currentCall === 3 ? 100 : 95 }
            ]),
          }),
        }
      })

      const caller = automationRouter.createCaller(mockContext)
      const result = await caller.getStats()

      expect(result.totalRules).toBe(5)
      expect(result.activeRules).toBe(4)
      expect(result.totalExecutions).toBe(100)
      expect(result.successfulExecutions).toBe(95)
      expect(result.successRate).toBe(95)
    })

    test('handles zero executions', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      })

      const caller = automationRouter.createCaller(mockContext)
      const result = await caller.getStats()

      expect(result.successRate).toBe(0)
    })
  })
})
