import { AzureDocumentIntelligenceProvider } from './providers/azure-document-intelligence.provider';
import { MistralOcrProvider } from './providers/mistral-ocr.provider';
import { Gpt4oVisionOcrProvider } from './providers/gpt4o-vision-ocr.provider';
import { ClaudeNativeProvider } from './providers/claude-native.provider';
import type { OcrOutput } from './ocr-provider.interface';
export declare class OcrService {
    private readonly azure;
    private readonly mistral;
    private readonly gpt4oVision;
    private readonly claudeNative;
    private readonly logger;
    private readonly providers;
    constructor(azure: AzureDocumentIntelligenceProvider, mistral: MistralOcrProvider, gpt4oVision: Gpt4oVisionOcrProvider, claudeNative: ClaudeNativeProvider);
    extract(buffer: Buffer, mimeType: string, fileName: string): Promise<OcrOutput | null>;
    getProviderStatus(): {
        name: string;
        available: boolean;
    }[];
}
