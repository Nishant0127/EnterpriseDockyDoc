-- AlterTable
ALTER TABLE "document_versions" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "document_versions_contentHash_idx" ON "document_versions"("contentHash");
