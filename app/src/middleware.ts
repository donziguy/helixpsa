import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Use a simple JWT check instead of the full auth() wrapper
// to avoid edge runtime crypto issues
export function middleware(request: NextRequest) {
  const { nextUrl } = request

  // Check for session token (next-auth sets these cookies)
  const sessionToken = request.cookies.get('authjs.session-token')?.value
    || request.cookies.get('__Secure-authjs.session-token')?.value

  const isLoggedIn = !!sessionToken

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/signup', '/portal']
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname)

  // API auth routes are always accessible
  if (nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // If not logged in and trying to access protected route
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/signin', nextUrl))
  }

  // If logged in and trying to access auth pages, redirect to dashboard
  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL('/', nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}