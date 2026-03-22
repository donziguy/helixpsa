import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useSocket, useRealtimeEvent } from './useSocket'
import type { RealtimeEvent } from '@/lib/realtime'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

// Mock socket.io-client
const mockSocket = {
  id: 'socket-123',
  connected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

// Test component for useSocket hook
function TestSocketComponent({ 
  options = {},
  onEvent,
}: { 
  options?: any
  onEvent?: (event: RealtimeEvent) => void
}) {
  const { isConnected, error, joinTicket, leaveTicket } = useSocket({
    ...options,
    onEvent,
  })

  return (
    <div>
      <div data-testid="connection-status">
        {isConnected ? 'connected' : 'disconnected'}
      </div>
      {error && <div data-testid="error">{error}</div>}
      <button 
        data-testid="join-ticket"
        onClick={() => joinTicket('ticket-1')}
      >
        Join Ticket
      </button>
      <button 
        data-testid="leave-ticket"
        onClick={() => leaveTicket('ticket-1')}
      >
        Leave Ticket
      </button>
    </div>
  )
}

// Test component for useRealtimeEvent hook
function TestRealtimeEventComponent() {
  const events: RealtimeEvent[] = []
  
  useRealtimeEvent('ticket_created', (data) => {
    events.push({ type: 'ticket_created', data })
  })

  return (
    <div>
      <div data-testid="event-count">{events.length}</div>
    </div>
  )
}

describe('useSocket', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      organizationId: 'org-1',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSocket.connected = false
    vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should initialize socket when session is available', () => {
    const { io } = require('socket.io-client')
    
    render(<TestSocketComponent />)

    expect(io).toHaveBeenCalledWith(
      expect.stringContaining('localhost:3002'),
      expect.objectContaining({
        auth: expect.objectContaining({
          sessionData: mockSession,
        }),
      })
    )
  })

  it('should not initialize socket when no session', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated' })
    const { io } = require('socket.io-client')
    
    render(<TestSocketComponent />)

    expect(io).not.toHaveBeenCalled()
  })

  it('should handle connection events', () => {
    let connectHandler: () => void
    let disconnectHandler: () => void
    
    mockSocket.on.mockImplementation((event, handler) => {
      if (event === 'connect') connectHandler = handler
      if (event === 'disconnect') disconnectHandler = handler
    })

    render(<TestSocketComponent />)

    // Initially disconnected
    expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected')

    // Simulate connection
    act(() => {
      mockSocket.connected = true
      connectHandler!()
    })

    expect(screen.getByTestId('connection-status')).toHaveTextContent('connected')

    // Simulate disconnection
    act(() => {
      mockSocket.connected = false
      disconnectHandler!()
    })

    expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected')
  })

  it('should handle connection errors', () => {
    let errorHandler: (error: Error) => void
    
    mockSocket.on.mockImplementation((event, handler) => {
      if (event === 'connect_error') errorHandler = handler
    })

    render(<TestSocketComponent />)

    // Simulate connection error
    act(() => {
      errorHandler!(new Error('Connection failed'))
    })

    expect(screen.getByTestId('error')).toHaveTextContent('Connection failed')
  })

  it('should call onEvent when realtime event is received', () => {
    const onEvent = vi.fn()
    let eventHandler: (event: RealtimeEvent) => void
    
    mockSocket.on.mockImplementation((event, handler) => {
      if (event === 'realtime:event') eventHandler = handler
    })

    render(<TestSocketComponent onEvent={onEvent} />)

    const testEvent: RealtimeEvent = {
      type: 'ticket_created',
      data: { id: 'ticket-1' } as any,
    }

    // Simulate receiving event
    act(() => {
      eventHandler!(testEvent)
    })

    expect(onEvent).toHaveBeenCalledWith(testEvent)
  })

  it('should emit join and leave events for tickets', () => {
    mockSocket.connected = true
    
    render(<TestSocketComponent />)

    // Join ticket
    act(() => {
      screen.getByTestId('join-ticket').click()
    })

    expect(mockSocket.emit).toHaveBeenCalledWith('realtime:join', { ticketId: 'ticket-1' })

    // Leave ticket
    act(() => {
      screen.getByTestId('leave-ticket').click()
    })

    expect(mockSocket.emit).toHaveBeenCalledWith('realtime:leave', { ticketId: 'ticket-1' })
  })

  it('should not emit when not connected', () => {
    mockSocket.connected = false
    
    render(<TestSocketComponent />)

    act(() => {
      screen.getByTestId('join-ticket').click()
    })

    expect(mockSocket.emit).not.toHaveBeenCalled()
  })

  it('should cleanup on unmount', () => {
    const { unmount } = render(<TestSocketComponent />)

    unmount()

    expect(mockSocket.disconnect).toHaveBeenCalled()
  })
})

describe('useRealtimeEvent', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      organizationId: 'org-1',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' })
  })

  it('should register event handler for specific event type', () => {
    let eventHandler: (event: RealtimeEvent) => void
    
    mockSocket.on.mockImplementation((event, handler) => {
      if (event === 'realtime:event') eventHandler = handler
    })

    render(<TestRealtimeEventComponent />)

    const testEvent: RealtimeEvent = {
      type: 'ticket_created',
      data: { id: 'ticket-1' } as any,
    }

    // Simulate receiving matching event
    act(() => {
      eventHandler!(testEvent)
    })

    expect(screen.getByTestId('event-count')).toHaveTextContent('1')

    // Simulate receiving non-matching event
    const otherEvent: RealtimeEvent = {
      type: 'ticket_updated',
      data: { id: 'ticket-1' } as any,
    }

    act(() => {
      eventHandler!(otherEvent)
    })

    // Count should not change
    expect(screen.getByTestId('event-count')).toHaveTextContent('1')
  })

  it('should unregister event handler on unmount', () => {
    const { unmount } = render(<TestRealtimeEventComponent />)

    unmount()

    expect(mockSocket.off).toHaveBeenCalledWith('realtime:event', expect.any(Function))
  })
})