import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Route protection middleware.
 *
 * Currently only defines the matcher — actual token validation will be added
 * once the auth layer is implemented.
 *
 * With NextAuth: import { getToken } from 'next-auth/jwt' and check the token.
 * With custom JWT: read the cookie, verify the signature, redirect if invalid.
 */

// Routes that do NOT require authentication
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // TODO: Validate session token here.
  // Example:
  //   const token = await getToken({ req: request });
  //   if (!token) return NextResponse.redirect(new URL('/login', request.url));

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except static files and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
