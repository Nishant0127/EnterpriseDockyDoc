import { ReminderChannel, ReminderStatus } from '@prisma/client';
export declare class ReminderQueryDto {
    workspaceId: string;
}
export declare class ExpiringDocumentDto {
    id: string;
    name: string;
    workspaceId: string;
    expiryDate: Date | null;
    renewalDueDate: Date | null;
    isReminderEnabled: boolean;
    folderName: string | null;
    ownerEmail: string;
    daysUntilExpiry: number;
}
export declare class UpcomingReminderDto {
    id: string;
    documentId: string;
    documentName: string;
    remindAt: Date;
    channel: ReminderChannel;
    status: ReminderStatus;
    expiryDate: Date | null;
}
