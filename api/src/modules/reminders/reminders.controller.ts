import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DevAuthGuard, type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RemindersService } from './reminders.service';
import {
  ExpiringDocumentDto,
  ReminderQueryDto,
  UpcomingReminderDto,
} from './dto/reminder-query.dto';

/**
 * Reminders endpoints.
 * Routes: /api/v1/reminders/*
 */
@ApiTags('Reminders')
@Controller('reminders')
@UseGuards(DevAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  /**
   * GET /api/v1/reminders?workspaceId=...
   * Returns all PENDING reminders for documents in the workspace.
   */
  @Get()
  @ApiOperation({ summary: 'List pending reminders for a workspace' })
  @ApiResponse({ status: 200, type: [UpcomingReminderDto] })
  getReminders(
    @Query() query: ReminderQueryDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<UpcomingReminderDto[]> {
    return this.remindersService.getWorkspaceReminders(query.workspaceId, user);
  }

  /**
   * GET /api/v1/reminders/expiring?workspaceId=...
   * Returns documents expiring within the next 90 days (or already expired).
   */
  @Get('expiring')
  @ApiOperation({ summary: 'List expiring/expired documents in a workspace (90-day window)' })
  @ApiResponse({ status: 200, type: [ExpiringDocumentDto] })
  getExpiring(
    @Query() query: ReminderQueryDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<ExpiringDocumentDto[]> {
    return this.remindersService.getExpiringDocuments(query.workspaceId, user);
  }
}
