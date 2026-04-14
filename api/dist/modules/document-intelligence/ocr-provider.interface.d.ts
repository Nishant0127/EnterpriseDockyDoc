export interface OcrPage {
    pageNumber: number;
    text: string;
    tables?: string[];
}
export interface OcrOutput {
    provider: string;
    fullText: string;
    pages: OcrPage[];
    keyValuePairs?: Record<string, string>;
    pageCount: number;
    confidence: number;
    processingTimeMs: number;
}
export interface OcrProvider {
    readonly name: string;
    isAvailable(): boolean;
    canHandle(mimeType: string): boolean;
    extract(buffer: Buffer, mimeType: string, fileName: string): Promise<OcrOutput | null>;
}
