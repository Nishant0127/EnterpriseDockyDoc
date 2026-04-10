import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';

/**
 * TextExtractorService — extracts plain text from uploaded file buffers.
 *
 * Supported formats:
 *   .txt / .csv / .md / .json / .xml / text/* MIME — decoded as UTF-8
 *   .pdf  — via pdf-parse (text-layer only; scanned PDFs → AI Vision handled separately)
 *   .docx — via mammoth
 *   .doc  — via mammoth (best-effort; older binary format)
 *   images — return null (AI Vision handled in extractDocument)
 *
 * Unsupported formats return null.
 * All errors are caught and logged — extraction failures never propagate.
 */
@Injectable()
export class TextExtractorService {
  private readonly logger = new Logger(TextExtractorService.name);

  async extract(
    buffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<string | null> {
    const ext = path.extname(fileName).toLowerCase();

    try {
      // ---- Plain text variants ---------------------------------- //
      if (
        ext === '.txt' ||
        ext === '.csv' ||
        ext === '.md' ||
        ext === '.json' ||
        ext === '.xml' ||
        mimeType.startsWith('text/')
      ) {
        return buffer.toString('utf-8').trim() || null;
      }

      // ---- PDF -------------------------------------------------- //
      if (ext === '.pdf' || mimeType === 'application/pdf') {
        return await this.extractPdf(buffer);
      }

      // ---- DOCX / DOC ------------------------------------------- //
      if (
        ext === '.docx' ||
        ext === '.doc' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        return await this.extractWord(buffer);
      }

      // ---- Images — handled by AI Vision, no text extraction ---- //
      if (mimeType.startsWith('image/')) {
        return null;
      }

      // Unsupported type
      return null;
    } catch (err) {
      this.logger.warn(
        `Extraction failed for "${fileName}" (${mimeType}): ${(err as Error).message}`,
      );
      return null;
    }
  }

  private async extractPdf(buffer: Buffer): Promise<string | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (
        buf: Buffer,
      ) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      return data.text.trim() || null;
    } catch (err) {
      this.logger.warn(`PDF extraction error: ${(err as Error).message}`);
      return null;
    }
  }

  private async extractWord(buffer: Buffer): Promise<string | null> {
    try {
      // mammoth handles both .docx and .doc (best-effort for legacy .doc)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth') as {
        extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
      };
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim() || null;
    } catch (err) {
      this.logger.warn(`Word extraction error: ${(err as Error).message}`);
      return null;
    }
  }
}
