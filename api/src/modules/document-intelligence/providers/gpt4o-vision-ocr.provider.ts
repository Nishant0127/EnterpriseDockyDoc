import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OcrOutput, OcrProvider } from '../ocr-provider.interface';

/**
 * GPT-4o Vision OCR provider.
 *
 * Used as a high-quality fallback when Azure DI and Mistral cannot OCR an image.
 * Handles common image formats only — NOT PDFs (Azure DI / Mistral handle those better).
 *
 * Required env var:
 *   OPENAI_API_KEY
 */
@Injectable()
export class Gpt4oVisionOcrProvider implements OcrProvider {
  readonly name = 'gpt4o-vision-ocr';
  private readonly logger = new Logger(Gpt4oVisionOcrProvider.name);

  private readonly apiKey: string | null;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY') ?? null;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  canHandle(mimeType: string): boolean {
    // Only images — PDFs are handled better by Azure DI / Mistral
    return (
      mimeType === 'image/jpeg' ||
      mimeType === 'image/jpg' ||
      mimeType === 'image/png' ||
      mimeType === 'image/webp' ||
      mimeType === 'image/gif'
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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const OpenAI = require('openai');
      const client = new OpenAI.OpenAI({ apiKey: this.apiKey });

      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;

      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  'You are an OCR engine. Transcribe ALL text visible in this image exactly as it appears.',
                  'Preserve original formatting, line breaks, and structure as much as possible.',
                  'Include every field label, value, date, number, address, and signature text.',
                  'If there is a table, render it with pipe-separated columns.',
                  'Do NOT interpret, summarize, or add anything not in the image.',
                  'Output ONLY the raw transcribed text — no commentary, no markdown code fences.',
                ].join(' '),
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0,
      });

      const fullText = response.choices[0]?.message?.content?.trim() ?? '';

      if (!fullText) {
        this.logger.warn(`GPT-4o Vision OCR returned empty text for "${fileName}"`);
        return null;
      }

      this.logger.log(
        `[GPT-4o Vision OCR] Extracted ${fullText.length} chars from "${fileName}" in ${Date.now() - start}ms`,
      );

      return {
        provider: this.name,
        fullText,
        pages: [{ pageNumber: 1, text: fullText }],
        pageCount: 1,
        confidence: 0.88,
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      this.logger.warn(
        `GPT-4o Vision OCR error for "${fileName}": ${(err as Error).message}`,
      );
      return null;
    }
  }
}
