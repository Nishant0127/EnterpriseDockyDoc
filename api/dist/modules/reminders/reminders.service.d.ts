import { PrismaService } from '../../prisma/prisma.service';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import { ExpiringDocumentDto, UpcomingReminderDto } from './dto/reminder-query.dto';
export declare class RemindersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getWorkspaceReminders(workspaceId: string, user: DevUserPayload): Promise<UpcomingReminderDto[]>;
    getExpiringDocuments(workspaceId: string, user: DevUserPayload): Promise<ExpiringDocumentDto[]>;
}
