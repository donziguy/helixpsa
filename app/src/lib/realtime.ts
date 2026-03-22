import type { Ticket, TimeEntry, Client, User } from '@/db/schema'
import { pubsub } from './redis'

/**
 * Real-time event types
 */
export type RealtimeEvent = 
  | { type: 'ticket_created'; data: Ticket }
  | { type: 'ticket_updated'; data: Ticket }
  | { type: 'ticket_deleted'; data: { id: string; organizationId: string } }
  | { type: 'ticket_assigned'; data: { ticketId: string; assigneeId: string | null; organizationId: string } }
  | { type: 'ticket_status_changed'; data: { ticketId: string; status: string; organizationId: string } }
  | { type: 'time_entry_created'; data: TimeEntry }
  | { type: 'time_entry_updated'; data: TimeEntry }
  | { type: 'time_entry_deleted'; data: { id: string; ticketId: string; organizationId: string } }
  | { type: 'timer_started'; data: { ticketId: string; userId: string; startTime: string; organizationId: string } }
  | { type: 'timer_stopped'; data: { ticketId: string; userId: string; duration: number; organizationId: string } }
  | { type: 'client_created'; data: Client }
  | { type: 'client_updated'; data: Client }
  | { type: 'user_status_changed'; data: { userId: string; isActive: boolean; organizationId: string } }

/**
 * Channel naming conventions
 */
export const channels = {
  organization: (orgId: string) => `org:${orgId}`,
  ticket: (ticketId: string) => `ticket:${ticketId}`,
  user: (userId: string) => `user:${userId}`,
  global: 'global',
}

/**
 * Event emitter utilities
 */
export const events = {
  /**
   * Emit a ticket-related event
   */
  async emitTicketEvent(event: RealtimeEvent, organizationId: string): Promise<void> {
    // Emit to organization channel for all users in the org
    await pubsub.publish(channels.organization(organizationId), event)
    
    // For specific ticket events, also emit to ticket-specific channel
    if (event.type.startsWith('ticket_') && 'data' in event && typeof event.data === 'object' && 'id' in event.data) {
      await pubsub.publish(channels.ticket(event.data.id as string), event)
    }
  },

  /**
   * Emit a time entry event
   */
  async emitTimeEntryEvent(event: RealtimeEvent, organizationId: string): Promise<void> {
    await pubsub.publish(channels.organization(organizationId), event)
    
    // Also emit to the specific ticket channel if applicable
    if (event.type.startsWith('time_entry_') && 'data' in event && typeof event.data === 'object' && 'ticketId' in event.data) {
      await pubsub.publish(channels.ticket(event.data.ticketId as string), event)
    }
  },

  /**
   * Emit a timer event (for active time tracking)
   */
  async emitTimerEvent(event: RealtimeEvent, organizationId: string): Promise<void> {
    await pubsub.publish(channels.organization(organizationId), event)
    
    if (event.type.startsWith('timer_') && 'data' in event && typeof event.data === 'object' && 'ticketId' in event.data) {
      await pubsub.publish(channels.ticket(event.data.ticketId as string), event)
    }
  },

  /**
   * Emit a client event
   */
  async emitClientEvent(event: RealtimeEvent, organizationId: string): Promise<void> {
    await pubsub.publish(channels.organization(organizationId), event)
  },

  /**
   * Emit a user status event
   */
  async emitUserEvent(event: RealtimeEvent, organizationId: string): Promise<void> {
    await pubsub.publish(channels.organization(organizationId), event)
    
    if (event.type === 'user_status_changed' && 'data' in event && typeof event.data === 'object' && 'userId' in event.data) {
      await pubsub.publish(channels.user(event.data.userId as string), event)
    }
  },
}

/**
 * Utility functions for common real-time operations
 */
export const realtimeUtils = {
  /**
   * Get all channels a user should subscribe to
   */
  getUserChannels(userId: string, organizationId: string): string[] {
    return [
      channels.organization(organizationId),
      channels.user(userId),
    ]
  },

  /**
   * Get channels for a specific ticket (for focused updates)
   */
  getTicketChannels(ticketId: string, organizationId: string): string[] {
    return [
      channels.organization(organizationId),
      channels.ticket(ticketId),
    ]
  },

  /**
   * Validate event data structure
   */
  validateEvent(event: RealtimeEvent): boolean {
    if (!event.type || !event.data) {
      return false
    }

    // Basic validation - in a real app, you'd use Zod or similar
    switch (event.type) {
      case 'ticket_created':
      case 'ticket_updated':
        return typeof event.data === 'object' && 'id' in event.data && 'organizationId' in event.data
      
      case 'ticket_deleted':
        return typeof event.data === 'object' && 'id' in event.data && 'organizationId' in event.data
      
      case 'time_entry_created':
      case 'time_entry_updated':
        return typeof event.data === 'object' && 'id' in event.data && 'ticketId' in event.data && 'organizationId' in event.data
      
      case 'timer_started':
      case 'timer_stopped':
        return typeof event.data === 'object' && 'ticketId' in event.data && 'userId' in event.data && 'organizationId' in event.data
      
      default:
        return true
    }
  },
}