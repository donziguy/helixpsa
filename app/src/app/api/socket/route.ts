import { NextRequest, NextResponse } from 'next/server'
import { Server as HTTPServer } from 'http'
import { initializeSocketServer } from '@/lib/socket'

// We'll use this to store the server reference
let httpServer: HTTPServer | null = null

export async function GET(request: NextRequest) {
  try {
    // This is primarily for health checks
    // The actual Socket.io server is initialized in the custom server
    return NextResponse.json({ 
      status: 'Socket.io endpoint ready',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Socket endpoint error:', error)
    return NextResponse.json(
      { error: 'Socket endpoint error' },
      { status: 500 }
    )
  }
}

// Initialize the Socket.io server when the module loads
// Note: In a production setup, this would typically be done in a custom server
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  // Only initialize in development for now
  // In production, this should be handled by a custom server or similar
  console.log('Socket.io server initialization skipped in API route')
}