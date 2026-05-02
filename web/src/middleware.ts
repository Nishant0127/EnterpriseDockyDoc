import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Route protection middleware powered by Clerk.
 *
 * When NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set:
 *   - Unauthenticated users hitting protected routes are redirected to /login.
 *   - Public routes (/login, /register, /s/*, /api/health) pass through freely.
 *
 * When the key is absent (local dev without Clerk):
 *   - auth.protect() is never called → all routes pass through.
 *   - Client-side UserContext handles the 401-redirect fallback as before.
 *
 * Note: JWT / localStorage cannot be read in Edge middleware, but Clerk uses
 * an HttpOnly __session cookie set during the OAuth callback, so this works
 * server-side without any localStorage access.
 */

const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/register(.*)',
  '/forgot-password(.*)',
  '/s/(.*)',            // public share links
  '/join/(.*)',         // workspace invitation acceptance
  '/api/health(.*)',   // health-check endpoint
  '/api/v1/(.*)',      // Render backend API — auth is handled by ClerkAuthGuard there
]);

export default clerkMiddleware(async (auth, request) => {
  // Only enforce Clerk auth when the publishable key is configured.
  // Without it the middleware is a transparent pass-through.
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  // Apply to all routes except Next.js internals, static assets, AND /api/v1/*.
  // /api/v1/* is our backend proxy — it must run with zero Clerk overhead so
  // streaming bodies and Authorization headers pass through untouched.
  matcher: ['/((?!api/v1|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
