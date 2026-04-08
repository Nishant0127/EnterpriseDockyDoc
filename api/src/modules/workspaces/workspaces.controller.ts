import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceResponseDto, WorkspaceDetailResponseDto } from './dto/workspace-response.dto';

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
   * Returns all active workspaces with member counts.
   */
  @Get()
  @ApiOperation({ summary: 'List all active workspaces' })
  @ApiResponse({ status: 200, type: [WorkspaceResponseDto] })
  findAll(): Promise<WorkspaceResponseDto[]> {
    return this.workspacesService.findAll();
  }

  /**
   * GET /api/v1/workspaces/:id
   * Returns workspace details including all active members.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by ID with members' })
  @ApiParam({ name: 'id', description: 'Workspace cuid' })
  @ApiResponse({ status: 200, type: WorkspaceDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  findOne(@Param('id') id: string): Promise<WorkspaceDetailResponseDto> {
    return this.workspacesService.findById(id);
  }
}
