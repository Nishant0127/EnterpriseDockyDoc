-- Migration: add_workspace_trash_retention
-- trashRetentionDays was added to the Workspace model in schema.prisma but the
-- corresponding ALTER TABLE was never committed as a migration.
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "trashRetentionDays" INTEGER NOT NULL DEFAULT 30;
