import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import { WorkspacesService } from './workspaces.service';
import {
  WorkspaceMemberDto,
  WorkspaceResponseDto,
  WorkspaceDetailResponseDto,
  WorkspaceSummaryDto,
} from './dto/workspace-response.dto';
import { AddWorkspaceMemberDto, UpdateWorkspaceMemberDto, UpdateWorkspaceDto } from './dto/add-member.dto';

/**
 * Workspaces endpoints.
 * Routes: /api/v1/workspaces/*
 */
@ApiTags('Workspaces')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  /**
   * GET /api/v1/workspaces
   */
  @Get()
  @ApiOperation({ summary: 'List all active workspaces' })
  @ApiResponse({ status: 200, type: [WorkspaceResponseDto] })
  findAll(): Promise<WorkspaceResponseDto[]> {
    return this.workspacesService.findAll();
  }

  /**
   * GET /api/v1/workspaces/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by ID with members' })
  @ApiParam({ name: 'id', description: 'Workspace cuid' })
  @ApiResponse({ status: 200, type: WorkspaceDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  findOne(@Param('id') id: string): Promise<WorkspaceDetailResponseDto> {
    return this.workspacesService.findById(id);
  }

  /**
   * PATCH /api/v1/workspaces/:id
   * Update workspace properties (name). ADMIN/OWNER only.
   */
  @Patch(':id')
  @UseGuards(DevAuthGuard)
  @ApiOperation({ summary: 'Update workspace (rename). ADMIN/OWNER only.' })
  @ApiParam({ name: 'id', description: 'Workspace cuid' })
  @ApiResponse({ status: 200, type: WorkspaceResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  updateWorkspace(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<WorkspaceResponseDto> {
    return this.workspacesService.update(id, dto, user);
  }

  /**
   * GET /api/v1/workspaces/:id/summary
   * Returns aggregate stats for the dashboard.
   */
  @Get(':id/summary')
  @UseGuards(DevAuthGuard)
  @ApiOperation({ summary: 'Get workspace dashboard summary stats' })
  @ApiParam({ name: 'id', description: 'Workspace cuid' })
  @ApiResponse({ status: 200, type: WorkspaceSummaryDto })
  getSummary(
    @Param('id') id: string,
    @CurrentUser() user: DevUserPayload,
  ): Promise<WorkspaceSummaryDto> {
    return this.workspacesService.getSummary(id, user);
  }

  /**
   * POST /api/v1/workspaces/:id/members
   * Add a member to the workspace. OWNER/ADMIN only.
   * Creates the user if they don't exist yet (find-or-create).
   */
  @Post(':id/members')
  @UseGuards(DevAuthGuard)
  @ApiOperation({ summary: 'Add member to workspace (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Workspace cuid' })
  @ApiResponse({ status: 201, type: WorkspaceMemberDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @ApiResponse({ status: 409, description: 'User already an active member' })
  addMember(
    @Param('id') id: string,
    @Body() dto: AddWorkspaceMemberDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<WorkspaceMemberDto> {
    return this.workspacesService.addMember(id, dto, user);
  }

  /**
   * PATCH /api/v1/workspaces/:id/members/:memberId
   * Update a member's role or status. OWNER/ADMIN only.
   * Guards against removing/demoting the last OWNER.
   */
  @Patch(':id/members/:memberId')
  @UseGuards(DevAuthGuard)
  @ApiOperation({ summary: 'Update workspace member role/status (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Workspace cuid' })
  @ApiParam({ name: 'memberId', description: 'WorkspaceUser cuid' })
  @ApiResponse({ status: 200, type: WorkspaceMemberDto })
  @ApiResponse({ status: 400, description: 'Cannot remove last owner' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateWorkspaceMemberDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<WorkspaceMemberDto> {
    return this.workspacesService.updateMember(id, memberId, dto, user);
  }

  /**
   * DELETE /api/v1/workspaces/:id/members/:memberId
   * Remove a member (sets status to REMOVED). OWNER/ADMIN only.
   */
  @Delete(':id/members/:memberId')
  @UseGuards(DevAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a workspace member (OWNER/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Workspace cuid' })
  @ApiParam({ name: 'memberId', description: 'WorkspaceUser cuid' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  @ApiResponse({ status: 400, description: 'Cannot remove last owner' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: DevUserPayload,
  ): Promise<void> {
    await this.workspacesService.updateMember(
      id,
      memberId,
      { status: 'REMOVED' as any },
      user,
    );
  }
}
