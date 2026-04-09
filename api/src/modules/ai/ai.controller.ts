import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';
import { IsNotEmpty, IsString } from 'class-validator';

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

@ApiTags('AI')
@Controller('ai')
@UseGuards(DevAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
}
