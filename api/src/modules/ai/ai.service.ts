import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    if (!this.client) {
      this.logger.warn('ANTHROPIC_API_KEY not set — AI features disabled');
    }
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  async analyzeDocument(documentId: string): Promise<{
    summary: string;
    keyPoints: string[];
    suggestedTags: string[];
    documentType: string;
    confidence: number;
  }> {
    if (!this.client) {
      return {
        summary: 'AI analysis unavailable — ANTHROPIC_API_KEY not configured.',
        keyPoints: [],
        suggestedTags: [],
        documentType: 'unknown',
        confidence: 0,
      };
    }

    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { searchContent: true, tags: { include: { tag: true } } },
    });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);

    const text = doc.searchContent?.extractedText ?? '';
    const prompt = `You are a document analyst. Analyze the following document and respond with JSON only.

Document name: ${doc.name}
Document type: ${doc.fileType}
Content excerpt (first 3000 chars): ${text.slice(0, 3000)}

Respond with this exact JSON structure:
{
  "summary": "2-3 sentence summary of the document",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "suggestedTags": ["tag1", "tag2"],
  "documentType": "contract|invoice|report|policy|agreement|other",
  "confidence": 0.85
}`;

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected AI response type');

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        summary: content.text.slice(0, 200),
        keyPoints: [],
        suggestedTags: [],
        documentType: 'unknown',
        confidence: 0.3,
      };
    }
  }

  async searchAssistant(
    workspaceId: string,
    question: string,
  ): Promise<{ answer: string; relevantDocuments: { id: string; name: string }[] }> {
    if (!this.client) {
      return {
        answer: 'AI search unavailable — ANTHROPIC_API_KEY not configured.',
        relevantDocuments: [],
      };
    }

    // Fetch recent documents with search content
    const docs = await this.prisma.document.findMany({
      where: { workspaceId, status: 'ACTIVE' },
      include: { searchContent: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const docContext = docs
      .filter((d) => d.searchContent?.extractedText)
      .slice(0, 10)
      .map((d) => `[${d.id}] ${d.name}: ${d.searchContent!.extractedText.slice(0, 500)}`)
      .join('\n\n');

    const prompt = `You are a document search assistant. Answer the user's question based on the documents below.

Question: ${question}

Available documents:
${docContext || 'No indexed documents found.'}

Respond with JSON:
{
  "answer": "Your helpful answer here",
  "relevantDocumentIds": ["id1", "id2"]
}`;

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected AI response');

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      const parsed = JSON.parse(jsonMatch[0]);
      const relevantDocuments = docs
        .filter((d) => (parsed.relevantDocumentIds ?? []).includes(d.id))
        .map((d) => ({ id: d.id, name: d.name }));
      return { answer: parsed.answer ?? content.text, relevantDocuments };
    } catch {
      return { answer: content.text.slice(0, 400), relevantDocuments: [] };
    }
  }

  async generateReport(
    type: string,
    data: Record<string, unknown>,
  ): Promise<{ title: string; summary: string; insights: string[]; recommendations: string[] }> {
    if (!this.client) {
      return {
        title: `${type} Report`,
        summary: 'AI report generation unavailable — ANTHROPIC_API_KEY not configured.',
        insights: [],
        recommendations: [],
      };
    }

    const prompt = `You are a document management analyst. Generate an executive summary report based on this data.

Report type: ${type}
Data: ${JSON.stringify(data, null, 2).slice(0, 2000)}

Respond with JSON:
{
  "title": "Report title",
  "summary": "2-3 sentence executive summary",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected AI response');

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        title: `${type} Report`,
        summary: content.text.slice(0, 300),
        insights: [],
        recommendations: [],
      };
    }
  }
}
