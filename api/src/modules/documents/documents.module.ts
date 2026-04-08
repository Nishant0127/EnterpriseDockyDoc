import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, DevAuthGuard],
  exports: [DocumentsService],
})
export class DocumentsModule {}
