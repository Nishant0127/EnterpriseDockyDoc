-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "WorkspacePlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "AiProvider" AS ENUM ('PLATFORM', 'BYOK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "AiProviderType" AS ENUM ('ANTHROPIC', 'OPENAI');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable (idempotent)
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "plan" "WorkspacePlan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "aiProvider" "AiProvider" NOT NULL DEFAULT 'PLATFORM';
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "aiProviderType" "AiProviderType" NOT NULL DEFAULT 'ANTHROPIC';
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "aiApiKeyEncrypted" TEXT;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "aiUsageTokens" INTEGER NOT NULL DEFAULT 0;
