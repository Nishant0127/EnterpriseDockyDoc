import { Module } from '@nestjs/common';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';

@Module({
  controllers: [RemindersController],
  providers: [RemindersService, DevAuthGuard],
})
export class RemindersModule {}
