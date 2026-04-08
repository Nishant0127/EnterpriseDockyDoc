import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';

/**
 * WorkspacesModule — multi-tenant workspace management.
 *
 * A Workspace is the top-level tenant unit in DockyDoc.
 * Users belong to one or more workspaces with a specific role.
 */
@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, DevAuthGuard],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
