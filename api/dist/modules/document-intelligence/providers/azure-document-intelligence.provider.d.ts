import { ConfigService } from '@nestjs/config';
import type { OcrOutput, OcrProvider } from '../ocr-provider.interface';
export declare class AzureDocumentIntelligenceProvider implements OcrProvider {
    private readonly config;
    readonly name = "azure-document-intelligence";
    private readonly logger;
    private readonly endpoint;
    private readonly apiKey;
    constructor(config: ConfigService);
    isAvailable(): boolean;
    canHandle(mimeType: string): boolean;
    extract(buffer: Buffer, mimeType: string, fileName: string): Promise<OcrOutput | null>;
    private getContentType;
}
