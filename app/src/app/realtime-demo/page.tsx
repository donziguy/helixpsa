'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { api } from '@/components/TRPCProvider'
import { useSocket, useRealtimeEvent } from '@/hooks/useSocket'
import type { Ticket, TimeEntry } from '@/db/schema'
import type { RealtimeEvent } from '@/lib/realtime'

export default function RealtimeDemoPage() {
  const { data: session } = useSession()
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  // Socket connection with event handling
  const { isConnected, error } = useSocket({
    autoConnect: true,
    onEvent: (event) => {
      setEvents(prev => [event, ...prev.slice(0, 9)]) // Keep last 10 events
    },
    onConnect: () => setConnectionStatus('connected'),
    onDisconnect: () => setConnectionStatus('disconnected'),
    onError: (error) => console.error('Socket error:', error),
  })

  // Fetch tickets and stats
  const ticketsQuery = api.tickets.getAll.useQuery({})
  const statsQuery = api.tickets.getStats.useQuery()

  // Listen to specific real-time events
  useRealtimeEvent('ticket_created', (data) => {
    // Invalidate queries to refresh the UI
    ticketsQuery.refetch()
    statsQuery.refetch()
  })

  useRealtimeEvent('ticket_updated', (data) => {
    ticketsQuery.refetch()
    statsQuery.refetch()
  })

  useRealtimeEvent('ticket_status_changed', (data) => {
    console.log('Ticket status changed:', data)
    statsQuery.refetch()
  })

  useRealtimeEvent('time_entry_created', (data) => {
    console.log('New time entry:', data)
    statsQuery.refetch()
  })

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600'
      case 'connecting': return 'text-yellow-600'
      case 'disconnected': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getEventTypeColor = (type: string) => {
    if (type.startsWith('ticket_')) return 'bg-blue-100 text-blue-800'
    if (type.startsWith('time_entry_')) return 'bg-green-100 text-green-800'
    if (type.startsWith('timer_')) return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
  }

  const formatEventData = (event: RealtimeEvent) => {
    switch (event.type) {
      case 'ticket_created':
        const ticket = event.data as Ticket
        return `Ticket "${ticket.title}" created`
      case 'ticket_updated':
        const updatedTicket = event.data as Ticket
        return `Ticket "${updatedTicket.title}" updated`
      case 'ticket_status_changed':
        return `Ticket ${event.data.ticketId} status changed to ${event.data.status}`
      case 'ticket_assigned':
        return `Ticket ${event.data.ticketId} assigned to ${event.data.assigneeId || 'unassigned'}`
      case 'time_entry_created':
        const timeEntry = event.data as TimeEntry
        return `Time entry created: ${timeEntry.description}`
      case 'timer_started':
        return `Timer started for ticket ${event.data.ticketId}`
      case 'timer_stopped':
        return `Timer stopped for ticket ${event.data.ticketId} (${event.data.duration}min)`
      default:
        return 'Unknown event'
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p>Please sign in to view the real-time demo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Real-time Demo
          </h1>
          <p className="text-gray-600">
            Live demonstration of real-time updates via Redis + Socket.io
          </p>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className={`font-medium ${getStatusColor()}`}>
                {connectionStatus}
              </span>
            </div>
            {error && (
              <div className="text-red-600 text-sm">
                Error: {error}
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Statistics</h2>
          {statsQuery.isLoading ? (
            <div className="text-gray-500">Loading statistics...</div>
          ) : statsQuery.error ? (
            <div className="text-red-500">Error loading statistics</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {statsQuery.data?.statusCounts.map((stat) => (
                <div key={stat.status} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {stat.status.replace('_', ' ')}
                  </div>
                </div>
              ))}
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {statsQuery.data?.todayHours || 0}h
                </div>
                <div className="text-sm text-gray-600">Today's Hours</div>
              </div>
            </div>
          )}
        </div>

        {/* Tickets List */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Recent Tickets</h2>
          {ticketsQuery.isLoading ? (
            <div className="text-gray-500">Loading tickets...</div>
          ) : ticketsQuery.error ? (
            <div className="text-red-500">Error loading tickets</div>
          ) : (
            <div className="space-y-3">
              {ticketsQuery.data?.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{ticket.title}</div>
                    <div className="text-sm text-gray-600">
                      {ticket.number} • {ticket.client?.name} • {ticket.priority}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                      ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Events */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Live Events</h2>
          {events.length === 0 ? (
            <div className="text-gray-500">No events yet. Create a ticket or start a timer to see real-time updates!</div>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <span className={`px-2 py-1 text-xs rounded-full ${getEventTypeColor(event.type)}`}>
                    {event.type}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{formatEventData(event)}</div>
                    <div className="text-sm text-gray-500">
                      {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}