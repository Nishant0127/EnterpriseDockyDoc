import { ConfigService } from '@nestjs/config';
import type { OcrOutput, OcrProvider } from '../ocr-provider.interface';
export declare class ClaudeNativeProvider implements OcrProvider {
    private readonly config;
    readonly name = "claude-native";
    private readonly logger;
    private readonly client;
    private static readonly VISION_TYPES;
    constructor(config: ConfigService);
    isAvailable(): boolean;
    canHandle(mimeType: string): boolean;
    extract(buffer: Buffer, mimeType: string, fileName: string): Promise<OcrOutput | null>;
    private extractPdf;
    private extractImage;
    private extractWord;
}
