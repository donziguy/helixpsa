import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { appRouter } from '@/server/api/root'
import { createTRPCContext } from '@/server/api/trpc'
import { db } from '@/db'
import { organizations, users, clients, tickets } from '@/db/schema'

// Mock auth session
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    organizationId: 'test-org-id',
    organizationName: 'Test Organization',
    role: 'admin',
  },
}

// Mock context
const mockContext = {
  db,
  session: mockSession,
  organizationId: 'test-org-id',
  userId: 'test-user-id',
}

// Create caller for testing
const caller = appRouter.createCaller(mockContext)

describe('tRPC API', () => {
  describe('tickets router', () => {
    it('should get all tickets for organization', async () => {
      const result = await caller.tickets.getAll({})
      expect(Array.isArray(result)).toBe(true)
    })

    it('should get ticket stats', async () => {
      const result = await caller.tickets.getStats()
      expect(result).toHaveProperty('statusCounts')
      expect(result).toHaveProperty('todayHours')
      expect(Array.isArray(result.statusCounts)).toBe(true)
      expect(typeof result.todayHours).toBe('number')
    })

    it('should filter tickets by status', async () => {
      const result = await caller.tickets.getAll({ status: 'open' })
      expect(Array.isArray(result)).toBe(true)
      // All returned tickets should be open status
      result.forEach(ticket => {
        expect(ticket.status).toBe('open')
      })
    })

    it('should filter tickets by priority', async () => {
      const result = await caller.tickets.getAll({ priority: 'high' })
      expect(Array.isArray(result)).toBe(true)
      // All returned tickets should be high priority
      result.forEach(ticket => {
        expect(ticket.priority).toBe('high')
      })
    })
  })

  describe('clients router', () => {
    it('should get all clients for organization', async () => {
      const result = await caller.clients.getAll()
      expect(Array.isArray(result)).toBe(true)
      // Each client should have ticket counts
      result.forEach(client => {
        expect(client).toHaveProperty('ticketCounts')
        expect(client.ticketCounts).toHaveProperty('open')
        expect(client.ticketCounts).toHaveProperty('total')
      })
    })

    it('should return clients with proper structure', async () => {
      const result = await caller.clients.getAll()
      if (result.length > 0) {
        const client = result[0]
        expect(client).toHaveProperty('id')
        expect(client).toHaveProperty('name')
        expect(client).toHaveProperty('slaTier')
        expect(client).toHaveProperty('slaHealth')
        expect(client).toHaveProperty('ticketCounts')
      }
    })
  })

  describe('time entries router', () => {
    it('should get all time entries for organization', async () => {
      const result = await caller.timeEntries.getAll({})
      expect(Array.isArray(result)).toBe(true)
    })

    it('should get time summary for date range', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')
      
      const result = await caller.timeEntries.getSummary({
        startDate,
        endDate,
      })
      
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('byUser')
      expect(result).toHaveProperty('byTicket')
      
      expect(result.total).toHaveProperty('totalHours')
      expect(result.total).toHaveProperty('billableHours')
      expect(result.total).toHaveProperty('entryCount')
      
      expect(Array.isArray(result.byUser)).toBe(true)
      expect(Array.isArray(result.byTicket)).toBe(true)
    })

    it('should get running timer (should return null if none)', async () => {
      const result = await caller.timeEntries.getRunningTimer()
      // Should return null or a timer object
      expect(result === null || (typeof result === 'object' && result.id)).toBe(true)
    })

    it('should filter time entries by billable status', async () => {
      const result = await caller.timeEntries.getAll({ billable: true })
      expect(Array.isArray(result)).toBe(true)
      // All returned entries should be billable
      result.forEach(entry => {
        expect(entry.billable).toBe(true)
      })
    })
  })

  describe('users router', () => {
    it('should get current user profile', async () => {
      const result = await caller.users.getMe()
      
      if (result) {
        expect(result).toHaveProperty('id')
        expect(result).toHaveProperty('email')
        expect(result).toHaveProperty('firstName')
        expect(result).toHaveProperty('lastName')
        expect(result).toHaveProperty('role')
      }
    })

    it('should get all users in organization', async () => {
      const result = await caller.users.getAll()
      expect(Array.isArray(result)).toBe(true)
      
      result.forEach(user => {
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('email')
        expect(user).toHaveProperty('firstName')
        expect(user).toHaveProperty('lastName')
        expect(user).toHaveProperty('role')
        expect(user.isActive).toBe(true) // Should only return active users
      })
    })
  })

  describe('authorization', () => {
    it('should throw unauthorized error without session', async () => {
      const unauthorizedCaller = appRouter.createCaller({
        db,
        session: null,
        organizationId: 'test-org-id',
        userId: 'test-user-id',
      })

      await expect(unauthorizedCaller.tickets.getAll({})).rejects.toThrow('UNAUTHORIZED')
    })

    it('should throw forbidden error without organization', async () => {
      const noOrgCaller = appRouter.createCaller({
        db,
        session: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            // Missing organizationId
          },
        },
        organizationId: 'test-org-id',
        userId: 'test-user-id',
      })

      await expect(noOrgCaller.tickets.getAll({})).rejects.toThrow('FORBIDDEN')
    })
  })

  describe('input validation', () => {
    it('should validate ticket creation input', async () => {
      // Missing required title
      await expect(caller.tickets.create({
        title: '', // Empty title should fail
        clientId: 'some-uuid',
      } as any)).rejects.toThrow()
    })

    it('should validate client creation input', async () => {
      // Missing required name
      await expect(caller.clients.create({
        name: '', // Empty name should fail
      } as any)).rejects.toThrow()
    })

    it('should validate time entry creation input', async () => {
      // Missing required description
      await expect(caller.timeEntries.create({
        ticketId: 'some-uuid',
        description: '', // Empty description should fail
        startTime: new Date(),
      } as any)).rejects.toThrow()
    })

    it('should validate UUID format', async () => {
      // Invalid UUID format
      await expect(caller.tickets.getById({
        id: 'not-a-uuid',
      })).rejects.toThrow()
    })
  })
})