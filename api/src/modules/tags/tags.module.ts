import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';

@Module({
  controllers: [TagsController],
  providers: [TagsService, DevAuthGuard],
  exports: [TagsService],
})
export class TagsModule {}
