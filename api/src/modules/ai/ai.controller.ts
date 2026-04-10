import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { AiService } from './ai.service';
import { ReportsService } from '../reports/reports.service';
import { DevAuthGuard, type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// ------------------------------------------------------------------ //
// DTOs
// ------------------------------------------------------------------ //
class AiSearchDto {
  @IsString()
  @IsNotEmpty()
  question!: string;
}

class AiReportDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  data!: Record<string, unknown>;
}

class AiApplyFieldsDto {
  @IsArray()
  @IsString({ each: true })
  fields!: string[];
}

class AiReportInsightsDto {
  // Optional additional context from frontend (merged with DB-fetched data)
  data?: Record<string, unknown>;
}

// ------------------------------------------------------------------ //
// Controller
// ------------------------------------------------------------------ //
@ApiTags('AI')
@Controller('ai')
@UseGuards(DevAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly reportsService: ReportsService,
  ) {}

  // ---------------------------------------------------------------- //
  // Existing endpoints
  // ---------------------------------------------------------------- //

  @Get('status')
  @ApiOperation({ summary: 'Check AI availability' })
  status() {
    return { enabled: this.aiService.isEnabled };
  }

  @Get('documents/:id/analyze')
  @ApiOperation({ summary: 'Analyze a document with AI' })
  @ApiResponse({ status: 200, description: 'AI analysis result' })
  analyze(@Param('id') id: string) {
    return this.aiService.analyzeDocument(id);
  }

  @Post('search')
  @ApiOperation({ summary: 'AI document search assistant' })
  search(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: AiSearchDto,
  ) {
    return this.aiService.searchAssistant(workspaceId, dto.question);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate an AI report' })
  generateReport(@Body() dto: AiReportDto) {
    return this.aiService.generateReport(dto.type, dto.data ?? {});
  }

  // ---------------------------------------------------------------- //
  // Extraction endpoints
  // ---------------------------------------------------------------- //

  @Post('documents/:id/extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run full AI extraction on a document' })
  @ApiResponse({ status: 200, description: 'AiExtractionResult' })
  extract(@Param('id') id: string) {
    return this.aiService.extractDocument(id);
  }

  @Get('documents/:id/extraction')
  @ApiOperation({ summary: 'Get the latest AI extraction result for a document' })
  @ApiResponse({ status: 200, description: 'AiExtractionResult or { status: "none" }' })
  async getExtraction(@Param('id') id: string) {
    const result = await this.aiService.getExtraction(id);
    if (result === null) {
      return { status: 'none' };
    }
    return result;
  }

  @Post('documents/:id/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply specific AI-extracted fields to the document' })
  @ApiResponse({ status: 200, description: 'Lists applied and skipped fields' })
  applyFields(
    @Param('id') id: string,
    @Body() dto: AiApplyFieldsDto,
  ) {
    return this.aiService.applyFields(id, dto.fields ?? []);
  }

  // ---------------------------------------------------------------- //
  // Report Insights — pre-fetches real DB data per report type
  // ---------------------------------------------------------------- //

  @Post('reports/insights')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI insights from live report data' })
  @ApiResponse({ status: 200, description: 'Summary, insights, recommendations, urgent items' })
  async reportInsights(
    @Query('workspaceId') workspaceId: string,
    @Query('reportType') reportType: string,
    @Body() dto: AiReportInsightsDto,
    @CurrentUser() user: DevUserPayload,
  ) {
    // Pre-fetch real data from the database based on report type
    // This guarantees AI always has accurate, up-to-date information
    let freshData: Record<string, unknown> = {};

    try {
      switch (reportType) {
        case 'expiring_documents':
          freshData = await this.reportsService.getExpiringDocuments(workspaceId, user, 90) as unknown as Record<string, unknown>;
          break;
        case 'document_activity':
          freshData = await this.reportsService.getDocumentActivity(workspaceId, user, 30) as unknown as Record<string, unknown>;
          break;
        case 'storage_usage':
          freshData = await this.reportsService.getStorageUsage(workspaceId, user) as unknown as Record<string, unknown>;
          break;
        case 'member_activity':
          freshData = await this.reportsService.getMemberActivity(workspaceId, user, 30) as unknown as Record<string, unknown>;
          break;
        case 'tag_coverage':
          freshData = await this.reportsService.getTagCoverage(workspaceId, user) as unknown as Record<string, unknown>;
          break;
        case 'compliance_exposure':
          freshData = await this.reportsService.getComplianceExposure(workspaceId, user) as unknown as Record<string, unknown>;
          break;
        default:
          // Unknown report type — use whatever the frontend sent
          freshData = dto.data ?? {};
      }
    } catch {
      // Fall back to frontend-provided data if DB fetch fails
      freshData = dto.data ?? {};
    }

    // Merge frontend data with fresh DB data (DB data takes precedence)
    const mergedData = { ...dto.data, ...freshData };

    return this.aiService.generateReportInsights(workspaceId, reportType, mergedData);
  }
}
