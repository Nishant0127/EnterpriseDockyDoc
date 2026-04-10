/**
 * dev-auth.guard.ts — backward-compatibility re-export shim.
 *
 * All controllers, modules, and services that import `DevAuthGuard` or
 * `DevUserPayload` from this file continue to work without any changes.
 *
 * The real implementation lives in clerk-auth.guard.ts.
 * `ClerkAuthGuard` is a dual-mode guard:
 *   - With CLERK_SECRET_KEY → verifies Clerk JWTs (production)
 *   - Without CLERK_SECRET_KEY → falls back to x-dev-user-email header (dev)
 */
export { ClerkAuthGuard as DevAuthGuard, type DevUserPayload } from './clerk-auth.guard';
