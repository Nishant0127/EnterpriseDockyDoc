-- CreateEnum
CREATE TYPE "WorkspacePlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('PLATFORM', 'BYOK');

-- CreateEnum
CREATE TYPE "AiProviderType" AS ENUM ('ANTHROPIC', 'OPENAI');

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN "plan" "WorkspacePlan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "workspaces" ADD COLUMN "aiProvider" "AiProvider" NOT NULL DEFAULT 'PLATFORM';
ALTER TABLE "workspaces" ADD COLUMN "aiProviderType" "AiProviderType" NOT NULL DEFAULT 'ANTHROPIC';
ALTER TABLE "workspaces" ADD COLUMN "aiApiKeyEncrypted" TEXT;
ALTER TABLE "workspaces" ADD COLUMN "aiUsageTokens" INTEGER NOT NULL DEFAULT 0;
