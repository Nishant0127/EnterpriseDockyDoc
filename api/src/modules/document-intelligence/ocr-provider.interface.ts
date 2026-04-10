/**
 * Normalized OCR output from any provider.
 */
export interface OcrPage {
  pageNumber: number;
  text: string;
  tables?: string[]; // stringified table content
}

export interface OcrOutput {
  provider: string;
  fullText: string;
  pages: OcrPage[];
  keyValuePairs?: Record<string, string>;
  pageCount: number;
  confidence: number; // 0-1 overall OCR confidence
  processingTimeMs: number;
}

/**
 * OCR provider interface — implement to add a new OCR source.
 */
export interface OcrProvider {
  readonly name: string;

  /** Whether this provider is configured and available (API keys set, etc.) */
  isAvailable(): boolean;

  /** Whether this provider can handle the given MIME type */
  canHandle(mimeType: string): boolean;

  /**
   * Extract text from a document buffer.
   * Returns null if extraction is not possible (unsupported format, API error, etc.)
   */
  extract(
    buffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<OcrOutput | null>;
}
