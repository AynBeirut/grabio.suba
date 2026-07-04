import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('authjs.session-token') || req.cookies.get('__Secure-authjs.session-token')
  const isLoggedIn = !!token
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')

  // Auth redirects
  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
