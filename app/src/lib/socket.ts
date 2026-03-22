import { Server as IOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { NextApiRequest } from 'next'
import { auth } from '@/lib/auth'
import { channels, pubsub, realtimeUtils } from './realtime'
import type { RealtimeEvent } from './realtime'

export interface SocketData {
  userId: string
  organizationId: string
  email: string
}

export interface ServerToClientEvents {
  'realtime:event': (event: RealtimeEvent) => void
  'realtime:connected': () => void
  'realtime:error': (error: string) => void
}

export interface ClientToServerEvents {
  'realtime:join': (data: { ticketId?: string }) => void
  'realtime:leave': (data: { ticketId?: string }) => void
}

let io: IOServer<ClientToServerEvents, ServerToClientEvents, {}, SocketData> | null = null

/**
 * Initialize Socket.io server
 */
export function initializeSocketServer(httpServer: HTTPServer) {
  if (io) return io

  io = new IOServer<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://helixpsa.anexio.co']
        : ['http://localhost:3000', 'http://localhost:3002'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // Extract session token from handshake auth or query
      const token = socket.handshake.auth.token || socket.handshake.query.token

      if (!token) {
        return next(new Error('Authentication token required'))
      }

      // For this implementation, we'll pass the session data directly
      // In a production app, you'd verify the JWT token here
      const sessionData = socket.handshake.auth.sessionData

      if (!sessionData || !sessionData.user || !sessionData.user.organizationId) {
        return next(new Error('Invalid session data'))
      }

      // Store user data in socket
      socket.data.userId = sessionData.user.id
      socket.data.organizationId = sessionData.user.organizationId
      socket.data.email = sessionData.user.email

      next()
    } catch (error) {
      next(new Error('Authentication failed'))
    }
  })

  // Handle connections
  io.on('connection', async (socket) => {
    console.log(`User ${socket.data.email} connected (${socket.id})`)

    // Join user-specific and organization channels
    const userChannels = realtimeUtils.getUserChannels(
      socket.data.userId,
      socket.data.organizationId
    )

    for (const channel of userChannels) {
      await socket.join(channel)
    }

    // Set up Redis subscriptions for this organization
    await subscribeToRedisChannels(socket)

    // Notify client of successful connection
    socket.emit('realtime:connected')

    // Handle joining specific ticket channels
    socket.on('realtime:join', async ({ ticketId }) => {
      if (ticketId) {
        await socket.join(channels.ticket(ticketId))
        console.log(`User ${socket.data.email} joined ticket:${ticketId}`)
      }
    })

    // Handle leaving ticket channels
    socket.on('realtime:leave', async ({ ticketId }) => {
      if (ticketId) {
        await socket.leave(channels.ticket(ticketId))
        console.log(`User ${socket.data.email} left ticket:${ticketId}`)
      }
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.data.email} disconnected: ${reason}`)
    })
  })

  return io
}

/**
 * Subscribe to Redis pub/sub channels for real-time events
 */
async function subscribeToRedisChannels(socket: Socket) {
  const organizationChannel = channels.organization(socket.data.organizationId)
  const userChannel = channels.user(socket.data.userId)

  // Subscribe to organization-wide events
  await pubsub.subscribe(organizationChannel, (event: RealtimeEvent) => {
    if (realtimeUtils.validateEvent(event)) {
      socket.emit('realtime:event', event)
    }
  })

  // Subscribe to user-specific events
  await pubsub.subscribe(userChannel, (event: RealtimeEvent) => {
    if (realtimeUtils.validateEvent(event)) {
      socket.emit('realtime:event', event)
    }
  })
}

/**
 * Get the Socket.io server instance
 */
export function getSocketServer(): IOServer<ClientToServerEvents, ServerToClientEvents, {}, SocketData> | null {
  return io
}

/**
 * Emit an event to all clients in a channel
 */
export async function emitToChannel(channel: string, event: RealtimeEvent): Promise<void> {
  if (!io) return

  io.to(channel).emit('realtime:event', event)
}

/**
 * Emit an event to a specific user
 */
export async function emitToUser(userId: string, event: RealtimeEvent): Promise<void> {
  if (!io) return

  const userChannel = channels.user(userId)
  io.to(userChannel).emit('realtime:event', event)
}

/**
 * Emit an event to all users in an organization
 */
export async function emitToOrganization(organizationId: string, event: RealtimeEvent): Promise<void> {
  if (!io) return

  const orgChannel = channels.organization(organizationId)
  io.to(orgChannel).emit('realtime:event', event)
}