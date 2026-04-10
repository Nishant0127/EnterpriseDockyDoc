import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OcrOutput, OcrProvider } from '../ocr-provider.interface';

/**
 * Mistral OCR provider using `mistral-ocr-latest` model.
 *
 * Required env var:
 *   MISTRAL_API_KEY
 *
 * Handles PDFs and images.
 * Falls back gracefully if env var is absent.
 */
@Injectable()
export class MistralOcrProvider implements OcrProvider {
  readonly name = 'mistral-ocr';
  private readonly logger = new Logger(MistralOcrProvider.name);

  private readonly apiKey: string | null;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('MISTRAL_API_KEY') ?? null;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  canHandle(mimeType: string): boolean {
    return (
      mimeType === 'application/pdf' ||
      mimeType === 'image/jpeg' ||
      mimeType === 'image/jpg' ||
      mimeType === 'image/png' ||
      mimeType === 'image/webp'
    );
  }

  async extract(
    buffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<OcrOutput | null> {
    if (!this.isAvailable()) return null;

    const start = Date.now();

    try {
      const base64Data = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      const isPdf = mimeType === 'application/pdf';

      const requestBody = {
        model: 'mistral-ocr-latest',
        document: isPdf
          ? { type: 'document_url', document_url: dataUrl }
          : { type: 'image_url', image_url: dataUrl },
        include_image_base64: false,
      };

      const response = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errBody = await response.text();
        this.logger.warn(
          `Mistral OCR failed (${response.status}): ${errBody.slice(0, 200)}`,
        );
        return null;
      }

      const data = (await response.json()) as MistralOcrResponse;

      const pages: OcrOutput['pages'] = (data.pages ?? []).map((p, idx) => ({
        pageNumber: p.index ?? idx + 1,
        text: p.markdown ?? '',
      }));

      const fullText = pages.map((p) => p.text).join('\n\n').trim();

      if (!fullText) {
        this.logger.warn(`Mistral OCR returned empty text for ${fileName}`);
        return null;
      }

      this.logger.log(
        `Mistral OCR extracted ${fullText.length} chars from ${fileName} in ${Date.now() - start}ms`,
      );

      return {
        provider: this.name,
        fullText,
        pages,
        pageCount: pages.length || 1,
        confidence: 0.9,
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      this.logger.warn(
        `Mistral OCR error for ${fileName}: ${(err as Error).message}`,
      );
      return null;
    }
  }
}

// ------------------------------------------------------------------ //
// Mistral OCR response shapes
// ------------------------------------------------------------------ //
interface MistralOcrResponse {
  pages?: {
    index?: number;
    markdown?: string;
  }[];
}
