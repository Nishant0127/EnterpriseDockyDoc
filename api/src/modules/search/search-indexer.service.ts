import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TextExtractorService } from './text-extractor.service';

/**
 * SearchIndexerService — builds and persists searchable content for a document.
 *
 * Called after every upload and version upload. Never throws — failures are
 * logged and swallowed so the main upload flow is never affected.
 *
 * The indexed content is a concatenation of:
 *   document name + description + file name + file type
 *   tag names
 *   metadata keys and values
 *   extracted file text (for supported formats)
 *
 * This content is stored in DocumentSearchContent.extractedText and queried
 * by the search endpoint using Postgres ILIKE.
 *
 * Future extension: replace this service with a vector-embedding pipeline
 * without touching any other code.
 */
@Injectable()
export class SearchIndexerService {
  private readonly logger = new Logger(SearchIndexerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: TextExtractorService,
  ) {}

  /**
   * Index a document. Safe to call fire-and-forget.
   * @param documentId  The document to index
   * @param file        Multer file from the upload (optional — metadata-only if absent)
   */
  async indexDocument(
    documentId: string,
    file?: Express.Multer.File,
  ): Promise<void> {
    try {
      const doc = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          tags: { include: { tag: { select: { name: true } } } },
          metadata: { select: { key: true, value: true } },
        },
      });

      if (!doc) {
        this.logger.warn(`indexDocument: document ${documentId} not found`);
        return;
      }

      // Extract file text if file buffer is available
      let fileText: string | null = null;
      if (file?.buffer?.length) {
        fileText = await this.extractor.extract(
          file.buffer,
          file.mimetype,
          file.originalname,
        );
      }

      // Build aggregated searchable string
      const parts: string[] = [
        doc.name,
        doc.description ?? '',
        doc.fileName,
        doc.fileType,
        doc.tags.map((t) => t.tag.name).join(' '),
        doc.metadata.map((m) => `${m.key} ${m.value}`).join(' '),
        fileText ?? '',
      ].map((s) => s.trim()).filter(Boolean);

      const extractedText = parts.join('\n');

      await this.prisma.documentSearchContent.upsert({
        where: { documentId },
        create: {
          documentId,
          extractedText,
          lastIndexedAt: new Date(),
        },
        update: {
          extractedText,
          lastIndexedAt: new Date(),
        },
      });

      this.logger.debug(
        `Indexed doc ${documentId}: ${extractedText.length} chars` +
          (fileText ? ` (${fileText.length} from file)` : ' (metadata only)'),
      );
    } catch (err) {
      // Log but never rethrow — upload must succeed even if indexing fails
      this.logger.error(
        `Failed to index document ${documentId}: ${(err as Error).message}`,
      );
    }
  }
}
