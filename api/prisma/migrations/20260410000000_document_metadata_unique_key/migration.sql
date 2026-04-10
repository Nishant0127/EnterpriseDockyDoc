-- DropIndex (idempotent)
DROP INDEX IF EXISTS "document_metadata_documentId_key_idx";

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "document_metadata_documentId_key_key" ON "document_metadata"("documentId", "key");
