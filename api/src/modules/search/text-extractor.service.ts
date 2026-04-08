import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';

/**
 * TextExtractorService — extracts plain text from uploaded file buffers.
 *
 * Supported formats:
 *   .txt / .csv / .md / .json / .xml / text/* MIME — decoded as UTF-8
 *   .pdf  — via pdf-parse (text-layer only; no OCR for scanned PDFs)
 *   .docx — via mammoth
 *
 * Unsupported formats return null.
 * All errors are caught and logged — extraction failures never propagate.
 *
 * Future extension points:
 *   - Add .xlsx extraction (xlsx / exceljs)
 *   - Add OCR (tesseract.js) for scanned PDFs/images
 *   - Add semantic chunking before vector indexing
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

      // ---- DOCX ------------------------------------------------- //
      if (
        ext === '.docx' ||
        mimeType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        return await this.extractDocx(buffer);
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

  private async extractDocx(buffer: Buffer): Promise<string | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth') as {
        extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
      };
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim() || null;
    } catch (err) {
      this.logger.warn(`DOCX extraction error: ${(err as Error).message}`);
      return null;
    }
  }
}
