import { describe, it, expect, beforeEach, vi } from 'vitest'
import { events, channels, realtimeUtils } from './realtime'
import type { RealtimeEvent } from './realtime'

// Mock the pubsub module
vi.mock('./redis', () => ({
  pubsub: {
    publish: vi.fn(),
  },
}))

describe('Realtime Events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('channels', () => {
    it('should generate correct channel names', () => {
      expect(channels.organization('org-123')).toBe('org:org-123')
      expect(channels.ticket('ticket-456')).toBe('ticket:ticket-456')
      expect(channels.user('user-789')).toBe('user:user-789')
      expect(channels.global).toBe('global')
    })
  })

  describe('events.emitTicketEvent', () => {
    it('should publish ticket event to organization channel', async () => {
      const { pubsub } = await import('./redis')
      const event: RealtimeEvent = {
        type: 'ticket_created',
        data: {
          id: 'ticket-1',
          organizationId: 'org-1',
          title: 'Test ticket',
        } as any,
      }

      await events.emitTicketEvent(event, 'org-1')

      expect(pubsub.publish).toHaveBeenCalledWith('org:org-1', event)
      expect(pubsub.publish).toHaveBeenCalledWith('ticket:ticket-1', event)
    })

    it('should only publish to organization channel for non-ticket-specific events', async () => {
      const { pubsub } = await import('./redis')
      const event: RealtimeEvent = {
        type: 'ticket_assigned',
        data: {
          ticketId: 'ticket-1',
          assigneeId: 'user-1',
          organizationId: 'org-1',
        },
      }

      await events.emitTicketEvent(event, 'org-1')

      expect(pubsub.publish).toHaveBeenCalledWith('org:org-1', event)
      // Should not publish to ticket channel for assignment events
      expect(pubsub.publish).not.toHaveBeenCalledWith('ticket:ticket-1', event)
    })
  })

  describe('events.emitTimeEntryEvent', () => {
    it('should publish time entry event to both organization and ticket channels', async () => {
      const { pubsub } = await import('./redis')
      const event: RealtimeEvent = {
        type: 'time_entry_created',
        data: {
          id: 'entry-1',
          ticketId: 'ticket-1',
          organizationId: 'org-1',
        } as any,
      }

      await events.emitTimeEntryEvent(event, 'org-1')

      expect(pubsub.publish).toHaveBeenCalledWith('org:org-1', event)
      expect(pubsub.publish).toHaveBeenCalledWith('ticket:ticket-1', event)
    })
  })

  describe('events.emitTimerEvent', () => {
    it('should publish timer event to both organization and ticket channels', async () => {
      const { pubsub } = await import('./redis')
      const event: RealtimeEvent = {
        type: 'timer_started',
        data: {
          ticketId: 'ticket-1',
          userId: 'user-1',
          startTime: '2023-01-01T10:00:00Z',
          organizationId: 'org-1',
        },
      }

      await events.emitTimerEvent(event, 'org-1')

      expect(pubsub.publish).toHaveBeenCalledWith('org:org-1', event)
      expect(pubsub.publish).toHaveBeenCalledWith('ticket:ticket-1', event)
    })
  })

  describe('events.emitClientEvent', () => {
    it('should publish client event to organization channel only', async () => {
      const { pubsub } = await import('./redis')
      const event: RealtimeEvent = {
        type: 'client_created',
        data: {
          id: 'client-1',
          organizationId: 'org-1',
        } as any,
      }

      await events.emitClientEvent(event, 'org-1')

      expect(pubsub.publish).toHaveBeenCalledWith('org:org-1', event)
      expect(pubsub.publish).toHaveBeenCalledTimes(1)
    })
  })

  describe('events.emitUserEvent', () => {
    it('should publish user event to both organization and user channels', async () => {
      const { pubsub } = await import('./redis')
      const event: RealtimeEvent = {
        type: 'user_status_changed',
        data: {
          userId: 'user-1',
          isActive: true,
          organizationId: 'org-1',
        },
      }

      await events.emitUserEvent(event, 'org-1')

      expect(pubsub.publish).toHaveBeenCalledWith('org:org-1', event)
      expect(pubsub.publish).toHaveBeenCalledWith('user:user-1', event)
    })
  })
})

describe('realtimeUtils', () => {
  describe('getUserChannels', () => {
    it('should return correct channels for a user', () => {
      const channels = realtimeUtils.getUserChannels('user-1', 'org-1')
      expect(channels).toEqual(['org:org-1', 'user:user-1'])
    })
  })

  describe('getTicketChannels', () => {
    it('should return correct channels for a ticket', () => {
      const channels = realtimeUtils.getTicketChannels('ticket-1', 'org-1')
      expect(channels).toEqual(['org:org-1', 'ticket:ticket-1'])
    })
  })

  describe('validateEvent', () => {
    it('should validate ticket_created event', () => {
      const event: RealtimeEvent = {
        type: 'ticket_created',
        data: {
          id: 'ticket-1',
          organizationId: 'org-1',
        } as any,
      }

      expect(realtimeUtils.validateEvent(event)).toBe(true)
    })

    it('should validate ticket_deleted event', () => {
      const event: RealtimeEvent = {
        type: 'ticket_deleted',
        data: {
          id: 'ticket-1',
          organizationId: 'org-1',
        },
      }

      expect(realtimeUtils.validateEvent(event)).toBe(true)
    })

    it('should validate time_entry_created event', () => {
      const event: RealtimeEvent = {
        type: 'time_entry_created',
        data: {
          id: 'entry-1',
          ticketId: 'ticket-1',
          organizationId: 'org-1',
        } as any,
      }

      expect(realtimeUtils.validateEvent(event)).toBe(true)
    })

    it('should validate timer_started event', () => {
      const event: RealtimeEvent = {
        type: 'timer_started',
        data: {
          ticketId: 'ticket-1',
          userId: 'user-1',
          organizationId: 'org-1',
        },
      }

      expect(realtimeUtils.validateEvent(event)).toBe(true)
    })

    it('should reject invalid events', () => {
      const invalidEvent = {
        type: 'invalid_type',
        data: null,
      } as any

      expect(realtimeUtils.validateEvent(invalidEvent)).toBe(false)
    })

    it('should reject events with missing required fields', () => {
      const invalidEvent: RealtimeEvent = {
        type: 'ticket_created',
        data: {
          // missing id and organizationId
        } as any,
      }

      expect(realtimeUtils.validateEvent(invalidEvent)).toBe(false)
    })
  })
})