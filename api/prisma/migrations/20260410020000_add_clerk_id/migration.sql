-- Migration: add_clerk_id
-- Adds an optional clerkId field to the users table for Clerk SSO integration.
-- NULL until a user first signs in via Clerk (populated by ClerkAuthGuard on first login).

ALTER TABLE "users" ADD COLUMN "clerkId" TEXT;

CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");
