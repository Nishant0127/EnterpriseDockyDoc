import { Module } from '@nestjs/common';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';

@Module({
  controllers: [FoldersController],
  providers: [FoldersService, DevAuthGuard],
  exports: [FoldersService],
})
export class FoldersModule {}
