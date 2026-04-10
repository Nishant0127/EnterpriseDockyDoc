import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AzureDocumentIntelligenceProvider } from './providers/azure-document-intelligence.provider';
import { MistralOcrProvider } from './providers/mistral-ocr.provider';
import { ClaudeNativeProvider } from './providers/claude-native.provider';
import { OcrService } from './ocr.service';
import { ExtractionService } from './extraction.service';

@Module({
  imports: [ConfigModule],
  providers: [
    AzureDocumentIntelligenceProvider,
    MistralOcrProvider,
    ClaudeNativeProvider,
    OcrService,
    ExtractionService,
  ],
  exports: [OcrService, ExtractionService],
})
export class DocumentIntelligenceModule {}
