import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OcrOutput, OcrProvider } from '../ocr-provider.interface';

/**
 * Azure Document Intelligence (Form Recognizer) OCR provider.
 *
 * Required env vars:
 *   AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT  e.g. https://<name>.cognitiveservices.azure.com
 *   AZURE_DOCUMENT_INTELLIGENCE_KEY       e.g. <32-char key>
 *
 * Uses the prebuilt-read model (general document OCR).
 * Falls back gracefully if env vars are absent.
 */
@Injectable()
export class AzureDocumentIntelligenceProvider implements OcrProvider {
  readonly name = 'azure-document-intelligence';
  private readonly logger = new Logger(AzureDocumentIntelligenceProvider.name);

  private readonly endpoint: string | null;
  private readonly apiKey: string | null;

  constructor(private readonly config: ConfigService) {
    this.endpoint =
      this.config.get<string>('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT') ?? null;
    this.apiKey =
      this.config.get<string>('AZURE_DOCUMENT_INTELLIGENCE_KEY') ?? null;
  }

  isAvailable(): boolean {
    return !!(this.endpoint && this.apiKey);
  }

  canHandle(mimeType: string): boolean {
    // Azure DI handles PDFs and common image types
    return (
      mimeType === 'application/pdf' ||
      mimeType.startsWith('image/') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
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
      const endpoint = this.endpoint!.replace(/\/$/, '');

      // Support both Document Intelligence (2024+) and Form Recognizer (older) API paths.
      // prebuilt-read is widely available across all tiers and reliably extracts full text.
      // Try newer path first; fall back to legacy on 404/400.
      const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30`;
      const legacyAnalyzeUrl = `${endpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;

      this.logger.log(`[Azure DI] Submitting "${fileName}" (${mimeType}, ${buffer.length} bytes) via prebuilt-read`);

      // Submit document for analysis
      let submitRes = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey!,
          'Content-Type': this.getContentType(mimeType),
        },
        body: buffer as unknown as BodyInit,
      });

      // If the new API path failed with 404, try the legacy path
      if (!submitRes.ok && (submitRes.status === 404 || submitRes.status === 400)) {
        this.logger.log(`[Azure DI] New API path returned ${submitRes.status}, trying legacy formrecognizer path`);
        submitRes = await fetch(legacyAnalyzeUrl, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey!,
            'Content-Type': this.getContentType(mimeType),
          },
          body: buffer as unknown as BodyInit,
        });
      }

      if (!submitRes.ok) {
        const errBody = await submitRes.text();
        this.logger.warn(
          `[Azure DI] Submit failed (${submitRes.status}): ${errBody.slice(0, 300)}`,
        );
        return null;
      }

      const operationLocation = submitRes.headers.get('Operation-Location');
      if (!operationLocation) {
        this.logger.warn('Azure DI: no Operation-Location header in response');
        return null;
      }

      // Poll for result (max 60s, backoff 2s→3s→3s intervals)
      let result: AzureDiResult | null = null;
      const delays = [2000, 2000, 3000, 3000, 3000, 3000, 4000, 4000, 4000, 4000, 5000, 5000, 5000, 5000, 5000];
      for (let attempt = 0; attempt < delays.length; attempt++) {
        await new Promise((r) => setTimeout(r, delays[attempt]));

        const pollRes = await fetch(operationLocation, {
          headers: { 'Ocp-Apim-Subscription-Key': this.apiKey! },
        });

        if (!pollRes.ok) {
          this.logger.warn(`[Azure DI] Poll failed (attempt ${attempt + 1}, status ${pollRes.status})`);
          // Retry on transient errors
          if (pollRes.status >= 500) continue;
          return null;
        }

        const pollData = (await pollRes.json()) as AzureDiPollResponse;
        this.logger.debug(`[Azure DI] Poll attempt ${attempt + 1}: status=${pollData.status}`);

        if (pollData.status === 'succeeded') {
          result = pollData.analyzeResult ?? null;
          break;
        }
        if (pollData.status === 'failed') {
          const errDetail = JSON.stringify((pollData as any).error ?? {});
          this.logger.warn(`[Azure DI] Analysis failed for "${fileName}": ${errDetail}`);
          return null;
        }
        // notStarted | running — continue polling
      }

      if (!result) {
        this.logger.warn(`[Azure DI] Timeout waiting for result for "${fileName}" (${delays.length} attempts)`);
        return null;
      }

      // Extract text and pages
      const fullText = result.content ?? '';
      const pages: OcrOutput['pages'] = (result.pages ?? []).map((p) => ({
        pageNumber: p.pageNumber,
        text: p.lines?.map((l) => l.content).join('\n') ?? '',
      }));

      // Extract key-value pairs if present
      const keyValuePairs: Record<string, string> = {};
      for (const kv of result.keyValuePairs ?? []) {
        const k = kv.key?.content?.trim();
        const v = kv.value?.content?.trim();
        if (k && v) {
          keyValuePairs[k] = v;
        }
      }

      this.logger.log(
        `[Azure DI] Extracted ${fullText.length} chars, ${pages.length} pages, ` +
        `${Object.keys(keyValuePairs).length} key-value pairs from "${fileName}" in ${Date.now() - start}ms`,
      );

      return {
        provider: this.name,
        fullText,
        pages,
        keyValuePairs: Object.keys(keyValuePairs).length > 0 ? keyValuePairs : undefined,
        pageCount: pages.length || 1,
        confidence: 0.95, // Azure DI is high-confidence
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      this.logger.warn(
        `Azure DI extraction error for ${fileName}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private getContentType(mimeType: string): string {
    // Azure DI accepts the raw MIME type
    return mimeType === 'application/pdf' ? 'application/pdf' : mimeType;
  }
}

// ------------------------------------------------------------------ //
// Azure DI response shapes (simplified)
// ------------------------------------------------------------------ //

interface AzureDiPollResponse {
  status: 'notStarted' | 'running' | 'succeeded' | 'failed';
  analyzeResult?: AzureDiResult;
}

interface AzureDiResult {
  content?: string;
  pages?: AzureDiPage[];
  keyValuePairs?: AzureDiKeyValue[];
}

interface AzureDiPage {
  pageNumber: number;
  lines?: { content: string }[];
}

interface AzureDiKeyValue {
  key?: { content?: string };
  value?: { content?: string };
}
