import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { DevAuthGuard, type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsOptional, IsInt, Min } from 'class-validator';

class ReportQueryDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  days?: number;
}

@ApiTags('Reports')
@Controller('reports')
@UseGuards(DevAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('expired-documents')
  @ApiOperation({ summary: 'Documents that have already expired' })
  expiredDocuments(
    @Query() q: ReportQueryDto,
    @CurrentUser() user: DevUserPayload,
  ) {
    return this.reportsService.getExpiredDocuments(q.workspaceId, user);
  }

  @Get('expiring-documents')
  @ApiOperation({ summary: 'Documents expiring within N days' })
  expiringDocuments(
    @Query() q: ReportQueryDto,
    @CurrentUser() user: DevUserPayload,
  ) {
    return this.reportsService.getExpiringDocuments(q.workspaceId, user, q.days ?? 30);
  }

  @Get('document-activity')
  @ApiOperation({ summary: 'Document activity over last N days' })
  documentActivity(
    @Query() q: ReportQueryDto,
    @CurrentUser() user: DevUserPayload,
  ) {
    return this.reportsService.getDocumentActivity(q.workspaceId, user, q.days ?? 30);
  }

  @Get('storage-usage')
  @ApiOperation({ summary: 'Storage usage by document type' })
  storageUsage(
    @Query() q: ReportQueryDto,
    @CurrentUser() user: DevUserPayload,
  ) {
    return this.reportsService.getStorageUsage(q.workspaceId, user);
  }

  @Get('member-activity')
  @ApiOperation({ summary: 'Member activity over last N days' })
  memberActivity(
    @Query() q: ReportQueryDto,
    @CurrentUser() user: DevUserPayload,
  ) {
    return this.reportsService.getMemberActivity(q.workspaceId, user, q.days ?? 30);
  }

  @Get('tag-coverage')
  @ApiOperation({ summary: 'Tag coverage across documents' })
  tagCoverage(
    @Query() q: ReportQueryDto,
    @CurrentUser() user: DevUserPayload,
  ) {
    return this.reportsService.getTagCoverage(q.workspaceId, user);
  }

  @Get('compliance-exposure')
  @ApiOperation({ summary: 'Compliance exposure summary' })
  complianceExposure(
    @Query() q: ReportQueryDto,
    @CurrentUser() user: DevUserPayload,
  ) {
    return this.reportsService.getComplianceExposure(q.workspaceId, user);
  }
}
