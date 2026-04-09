import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';

/**
 * AuditModule is global so AuditService can be injected into any feature
 * module (Documents, Shares, Workspaces) without explicit imports.
 */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, DevAuthGuard],
  exports: [AuditService],
})
export class AuditModule {}
