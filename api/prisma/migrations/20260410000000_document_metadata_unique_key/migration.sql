-- DropIndex
DROP INDEX IF EXISTS "document_metadata_documentId_key_idx";

-- CreateIndex
CREATE UNIQUE INDEX "document_metadata_documentId_key_key" ON "document_metadata"("documentId", "key");
