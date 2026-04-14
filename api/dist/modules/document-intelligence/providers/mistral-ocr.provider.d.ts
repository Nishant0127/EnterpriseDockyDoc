import { ConfigService } from '@nestjs/config';
import type { OcrOutput, OcrProvider } from '../ocr-provider.interface';
export declare class MistralOcrProvider implements OcrProvider {
    private readonly config;
    readonly name = "mistral-ocr";
    private readonly logger;
    private readonly apiKey;
    constructor(config: ConfigService);
    isAvailable(): boolean;
    canHandle(mimeType: string): boolean;
    extract(buffer: Buffer, mimeType: string, fileName: string): Promise<OcrOutput | null>;
}
