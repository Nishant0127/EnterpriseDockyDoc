import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { SearchModule } from '../search/search.module';
import { AiModule } from '../ai/ai.module';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';
import { AiService } from '../ai/ai.service';

@Module({
  imports: [SearchModule, AiModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DevAuthGuard, AiService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
