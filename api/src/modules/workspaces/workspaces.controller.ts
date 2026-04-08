import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';

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
   * List workspaces the current user belongs to.
   */
  @Get()
  @ApiOperation({ summary: 'List accessible workspaces' })
  findAll() {
    return this.workspacesService.findAll();
  }

  /**
   * GET /api/v1/workspaces/:id
   * Get workspace details.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by ID' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  findOne(@Param('id') id: string) {
    return this.workspacesService.findById(id);
  }
}
