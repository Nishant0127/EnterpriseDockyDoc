import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DevAuthGuard, type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from './audit.service';
import { AuditLogDto, AuditQueryDto } from './dto/audit.dto';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(DevAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/v1/audit?workspaceId=...
   * Returns recent activity for the workspace, newest first.
   */
  @Get()
  @ApiOperation({ summary: 'Get workspace activity feed' })
  @ApiResponse({ status: 200, type: [AuditLogDto] })
  getWorkspaceActivity(
    @Query() query: AuditQueryDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<AuditLogDto[]> {
    return this.auditService.getWorkspaceActivity(query, user);
  }
}
