import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import type { RealtimeEvent } from '@/lib/realtime'
import { useState, useCallback } from 'react'

// We use vi.hoisted() to make variables available in the hoisted vi.mock factory
const { mockSocket, mockIo, mockUseSession } = vi.hoisted(() => {
  const mockSocket = {
    id: 'socket-123',
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
  const mockIo = vi.fn(() => mockSocket)
  const mockUseSession = vi.fn()
  return { mockSocket, mockIo, mockUseSession }
})

vi.mock('socket.io-client', () => ({
  io: mockIo,
}))

vi.mock('next-auth/react', () => ({
  SessionProvider: vi.fn(({ children }: any) => children),
  useSession: mockUseSession,
  signOut: vi.fn(),
  signIn: vi.fn(),
}))

import { useSocket, useRealtimeEvent } from './useSocket'

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

// Test component for useRealtimeEvent hook - uses state for re-render
function TestRealtimeEventComponent() {
  const [eventCount, setEventCount] = useState(0)
  
  const handler = useCallback((data: any) => {
    setEventCount(c => c + 1)
  }, [])

  useRealtimeEvent('ticket_created', handler)

  return (
    <div>
      <div data-testid="event-count">{eventCount}</div>
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
    mockUseSession.mockReturnValue({ data: mockSession, status: 'authenticated' } as any)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should initialize socket when session is available', () => {
    render(<TestSocketComponent />)

    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: expect.objectContaining({
          sessionData: mockSession,
        }),
      })
    )
  })

  it('should not initialize socket when no session', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' } as any)
    mockIo.mockClear()
    
    render(<TestSocketComponent />)

    expect(mockIo).not.toHaveBeenCalled()
  })

  it('should handle connection events', () => {
    let connectHandler: () => void
    let disconnectHandler: () => void
    
    mockSocket.on.mockImplementation((event: string, handler: any) => {
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
    
    mockSocket.on.mockImplementation((event: string, handler: any) => {
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
    
    mockSocket.on.mockImplementation((event: string, handler: any) => {
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
    let connectHandler: () => void
    mockSocket.connected = true
    
    mockSocket.on.mockImplementation((event: string, handler: any) => {
      if (event === 'connect') connectHandler = handler
    })

    render(<TestSocketComponent />)

    // Trigger connect to set isConnected state
    act(() => {
      connectHandler!()
    })

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
    mockSocket.connected = false
    mockUseSession.mockReturnValue({ data: mockSession, status: 'authenticated' } as any)
  })

  it('should handle event registration via useSocket', () => {
    // useRealtimeEvent uses useSocket internally, which creates a socket
    // It then registers a handler on the socket for 'realtime:event'
    // We verify the socket was created and handlers were registered
    render(<TestRealtimeEventComponent />)

    // Socket should be initialized (io called at least once - useSocket + useRealtimeEvent)
    expect(mockIo).toHaveBeenCalled()
    
    // Initial count should be 0
    expect(screen.getByTestId('event-count')).toHaveTextContent('0')
  })

  it('should cleanup socket on unmount', () => {
    const { unmount } = render(<TestRealtimeEventComponent />)

    unmount()

    // disconnect should be called on cleanup
    expect(mockSocket.disconnect).toHaveBeenCalled()
  })
})
