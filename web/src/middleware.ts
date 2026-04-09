import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Route protection middleware.
 *
 * NOTE: JWT is stored in localStorage (not a cookie), so it is NOT accessible
 * here — Next.js middleware runs on the server/edge runtime and cannot read
 * localStorage. Therefore, route protection is handled client-side inside
 * UserContext: if fetchCurrentUser() returns a 401, UserContext redirects to
 * /login. This middleware is intentionally a pass-through.
 *
 * If you need server-side protection in the future, switch JWT storage to an
 * HttpOnly cookie and verify it here with `request.cookies.get('dockydoc-jwt')`.
 */

// Routes that do NOT require authentication
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through without any check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // All other routes: pass through — auth is enforced client-side via UserContext.
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except static files and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
