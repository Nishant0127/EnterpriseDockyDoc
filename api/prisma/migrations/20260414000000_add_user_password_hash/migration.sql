-- Migration: add_user_password_hash
-- passwordHash was added to the User model in schema.prisma but the
-- corresponding ALTER TABLE was never committed as a migration.
-- This migration adds the column so Prisma queries stop failing with
-- "The column users.passwordHash does not exist".

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
