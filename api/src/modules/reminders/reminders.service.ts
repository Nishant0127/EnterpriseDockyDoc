import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { assertWorkspaceMembership } from '../../common/helpers/workspace-access.helper';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import {
  ExpiringDocumentDto,
  UpcomingReminderDto,
} from './dto/reminder-query.dto';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns PENDING reminders for all documents in a workspace,
   * ordered by soonest remindAt first.
   */
  async getWorkspaceReminders(
    workspaceId: string,
    user: DevUserPayload,
  ): Promise<UpcomingReminderDto[]> {
    assertWorkspaceMembership(user, workspaceId);

    const reminders = await this.prisma.documentReminder.findMany({
      where: {
        status: 'PENDING',
        document: { workspaceId, status: { not: 'DELETED' } },
      },
      include: {
        document: { select: { name: true, expiryDate: true } },
      },
      orderBy: { remindAt: 'asc' },
    });

    return reminders.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      documentName: r.document.name,
      remindAt: r.remindAt,
      channel: r.channel,
      status: r.status,
      expiryDate: r.document.expiryDate,
    }));
  }

  /**
   * Returns documents that are expired or expiring within the next 90 days,
   * ordered by nearest expiry first.
   */
  async getExpiringDocuments(
    workspaceId: string,
    user: DevUserPayload,
  ): Promise<ExpiringDocumentDto[]> {
    assertWorkspaceMembership(user, workspaceId);

    const now = new Date();
    const window = new Date(now.getTime() + 90 * MS_PER_DAY);

    const docs = await this.prisma.document.findMany({
      where: {
        workspaceId,
        status: { not: 'DELETED' },
        expiryDate: { not: null, lte: window },
      },
      include: {
        folder: { select: { name: true } },
        owner: { select: { email: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return docs.map((d) => {
      const expiry = d.expiryDate!;
      const daysUntilExpiry = Math.round(
        (expiry.getTime() - now.getTime()) / MS_PER_DAY,
      );
      return {
        id: d.id,
        name: d.name,
        workspaceId: d.workspaceId,
        expiryDate: expiry,
        renewalDueDate: d.renewalDueDate,
        isReminderEnabled: d.isReminderEnabled,
        folderName: d.folder?.name ?? null,
        ownerEmail: d.owner.email,
        daysUntilExpiry,
      };
    });
  }
}
