import { Injectable, Logger } from '@nestjs/common';
import { AzureDocumentIntelligenceProvider } from './providers/azure-document-intelligence.provider';
import { MistralOcrProvider } from './providers/mistral-ocr.provider';
import { Gpt4oVisionOcrProvider } from './providers/gpt4o-vision-ocr.provider';
import { ClaudeNativeProvider } from './providers/claude-native.provider';
import type { OcrOutput, OcrProvider } from './ocr-provider.interface';

// Per-provider hard timeout — prevents a hung provider from blocking the pipeline indefinitely
const PROVIDER_TIMEOUT_MS: Record<string, number> = {
  'azure-document-intelligence': 50_000,
  'mistral-ocr': 30_000,
  'gpt4o-vision-ocr': 30_000,
  'claude-native': 60_000,
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * OcrService — routes document buffers through the best available OCR provider.
 *
 * Priority:
 *   1. Azure Document Intelligence (highest accuracy, layout-aware, key-value pairs)
 *   2. Mistral OCR (good accuracy, markdown-aware)
 *   3. GPT-4o Vision (image fallback — high quality, uses existing OpenAI key)
 *   4. Claude Native (fallback: Document API for PDF, Vision for images)
 *
 * Each provider is only tried if it's available and can handle the MIME type.
 * Each provider call is wrapped in a hard timeout so a hung provider never blocks the pipeline.
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly providers: OcrProvider[];

  constructor(
    private readonly azure: AzureDocumentIntelligenceProvider,
    private readonly mistral: MistralOcrProvider,
    private readonly gpt4oVision: Gpt4oVisionOcrProvider,
    private readonly claudeNative: ClaudeNativeProvider,
  ) {
    this.providers = [azure, mistral, gpt4oVision, claudeNative];

    this.logger.log(
      `OCR providers available: ${this.providers
        .filter((p) => p.isAvailable())
        .map((p) => p.name)
        .join(', ') || 'none'}`,
    );
  }

  /**
   * Extract text from a document buffer using the best available provider.
   * Returns null if no provider can handle the file.
   */
  async extract(
    buffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<OcrOutput | null> {
    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue;
      if (!provider.canHandle(mimeType)) continue;

      const timeoutMs = PROVIDER_TIMEOUT_MS[provider.name] ?? 30_000;

      this.logger.debug(
        `Trying OCR provider: ${provider.name} for ${fileName} (${mimeType}, timeout=${timeoutMs}ms)`,
      );

      const t0 = Date.now();
      try {
        const result = await withTimeout(
          provider.extract(buffer, mimeType, fileName),
          timeoutMs,
          provider.name,
        );
        const elapsed = Date.now() - t0;
        if (result && result.fullText.trim().length > 10) {
          this.logger.log(
            `OCR success via ${provider.name} for ${fileName}: ${result.fullText.length} chars in ${elapsed}ms`,
          );
          return result;
        }
        this.logger.debug(
          `${provider.name} returned empty/short result for ${fileName} in ${elapsed}ms, trying next`,
        );
      } catch (err) {
        const elapsed = Date.now() - t0;
        this.logger.warn(
          `${provider.name} failed for ${fileName} after ${elapsed}ms: ${(err as Error).message}`,
        );
      }
    }

    this.logger.warn(`No OCR provider could extract text from ${fileName}`);
    return null;
  }

  /**
   * Get a summary of which providers are configured and available.
   */
  getProviderStatus(): { name: string; available: boolean }[] {
    return this.providers.map((p) => ({
      name: p.name,
      available: p.isAvailable(),
    }));
  }
}
