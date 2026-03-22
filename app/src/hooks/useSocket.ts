'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import type { RealtimeEvent } from '@/lib/realtime'
import type { ServerToClientEvents, ClientToServerEvents } from '@/lib/socket'

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>

interface UseSocketOptions {
  autoConnect?: boolean
  onEvent?: (event: RealtimeEvent) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: string) => void
}

export function useSocket(options: UseSocketOptions = {}) {
  const { data: session } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<SocketType | null>(null)

  const {
    autoConnect = true,
    onEvent,
    onConnect,
    onDisconnect,
    onError,
  } = options

  useEffect(() => {
    if (!session?.user || !autoConnect) return

    const socketUrl = process.env.NODE_ENV === 'production' 
      ? 'https://helixpsa.anexio.co'
      : 'http://localhost:3002'

    // Create socket connection
    const socket: SocketType = io(socketUrl, {
      auth: {
        token: 'session-token', // In production, use actual JWT
        sessionData: session,
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    socketRef.current = socket

    // Connection handlers
    socket.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
      setError(null)
      onConnect?.()
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
      onDisconnect?.()
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
      setError(err.message)
      setIsConnected(false)
      onError?.(err.message)
    })

    // Real-time event handlers
    socket.on('realtime:connected', () => {
      console.log('Real-time connection established')
    })

    socket.on('realtime:event', (event: RealtimeEvent) => {
      console.log('Real-time event received:', event)
      onEvent?.(event)
    })

    socket.on('realtime:error', (error: string) => {
      console.error('Real-time error:', error)
      setError(error)
      onError?.(error)
    })

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [session, autoConnect, onEvent, onConnect, onDisconnect, onError])

  const connect = () => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect()
    }
  }

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
  }

  const joinTicket = (ticketId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('realtime:join', { ticketId })
    }
  }

  const leaveTicket = (ticketId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('realtime:leave', { ticketId })
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    error,
    connect,
    disconnect,
    joinTicket,
    leaveTicket,
  }
}

/**
 * Hook for listening to specific real-time events
 */
export function useRealtimeEvent<T extends RealtimeEvent['type']>(
  eventType: T,
  handler: (data: Extract<RealtimeEvent, { type: T }>['data']) => void,
  deps?: React.DependencyList
) {
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    const eventHandler = (event: RealtimeEvent) => {
      if (event.type === eventType) {
        handler(event.data as any)
      }
    }

    socket.on('realtime:event', eventHandler)

    return () => {
      socket.off('realtime:event', eventHandler)
    }
  }, [socket, eventType, handler, ...(deps || [])])
}

/**
 * Hook for managing ticket subscriptions
 */
export function useTicketSubscription(ticketId?: string) {
  const { joinTicket, leaveTicket, isConnected } = useSocket()

  useEffect(() => {
    if (!ticketId || !isConnected) return

    joinTicket(ticketId)

    return () => {
      leaveTicket(ticketId)
    }
  }, [ticketId, isConnected, joinTicket, leaveTicket])
}