"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemindersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const workspace_access_helper_1 = require("../../common/helpers/workspace-access.helper");
const MS_PER_DAY = 1000 * 60 * 60 * 24;
let RemindersService = class RemindersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getWorkspaceReminders(workspaceId, user) {
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, workspaceId);
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
    async getExpiringDocuments(workspaceId, user) {
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, workspaceId);
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
            const expiry = d.expiryDate;
            const daysUntilExpiry = Math.round((expiry.getTime() - now.getTime()) / MS_PER_DAY);
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
};
exports.RemindersService = RemindersService;
exports.RemindersService = RemindersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RemindersService);
//# sourceMappingURL=reminders.service.js.map