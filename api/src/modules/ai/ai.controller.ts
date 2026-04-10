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
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';

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
  data!: Record<string, unknown>;
}

// ------------------------------------------------------------------ //
// Controller
// ------------------------------------------------------------------ //
@ApiTags('AI')
@Controller('ai')
@UseGuards(DevAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
  // New extraction endpoints
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
  @ApiResponse({
    status: 200,
    description: 'Lists applied and skipped fields',
  })
  applyFields(
    @Param('id') id: string,
    @Body() dto: AiApplyFieldsDto,
  ) {
    return this.aiService.applyFields(id, dto.fields ?? []);
  }

  @Post('reports/insights')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI insights from pre-fetched report data' })
  @ApiResponse({
    status: 200,
    description: 'Summary, insights, recommendations, and urgent items',
  })
  reportInsights(
    @Query('workspaceId') workspaceId: string,
    @Query('reportType') reportType: string,
    @Body() dto: AiReportInsightsDto,
  ) {
    return this.aiService.generateReportInsights(
      workspaceId,
      reportType,
      dto.data ?? {},
    );
  }
}
