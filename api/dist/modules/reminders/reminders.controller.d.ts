import { type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { RemindersService } from './reminders.service';
import { ExpiringDocumentDto, ReminderQueryDto, UpcomingReminderDto } from './dto/reminder-query.dto';
export declare class RemindersController {
    private readonly remindersService;
    constructor(remindersService: RemindersService);
    getReminders(query: ReminderQueryDto, user: DevUserPayload): Promise<UpcomingReminderDto[]>;
    getExpiring(query: ReminderQueryDto, user: DevUserPayload): Promise<ExpiringDocumentDto[]>;
}
