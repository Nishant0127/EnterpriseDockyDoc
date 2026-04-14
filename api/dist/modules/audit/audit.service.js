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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = exports.AuditEntityType = exports.AuditAction = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "AuditAction", { enumerable: true, get: function () { return client_1.AuditAction; } });
Object.defineProperty(exports, "AuditEntityType", { enumerable: true, get: function () { return client_1.AuditEntityType; } });
const prisma_service_1 = require("../../prisma/prisma.service");
const workspace_access_helper_1 = require("../../common/helpers/workspace-access.helper");
const USER_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
};
let AuditService = AuditService_1 = class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AuditService_1.name);
    }
    log(params) {
        void this.prisma.auditLog
            .create({
            data: {
                workspaceId: params.workspaceId,
                userId: params.userId ?? null,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                metadata: (params.metadata ?? {}),
            },
        })
            .catch((err) => {
            this.logger.warn(`Audit log write failed [${params.action}]: ${err.message}`);
        });
    }
    async getWorkspaceActivity(query, user) {
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, query.workspaceId);
        const logs = await this.prisma.auditLog.findMany({
            where: {
                workspaceId: query.workspaceId,
                ...(query.entityType && { entityType: query.entityType }),
                ...(query.action && { action: query.action }),
                ...((query.dateFrom || query.dateTo) && {
                    createdAt: {
                        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
                        ...(query.dateTo && { lte: new Date(query.dateTo) }),
                    },
                }),
            },
            include: { user: { select: USER_SELECT } },
            orderBy: { createdAt: 'desc' },
            skip: query.offset ?? 0,
            take: query.limit ?? 50,
        });
        return logs.map(this.toDto);
    }
    async getDocumentActivity(documentId, user) {
        const doc = await this.prisma.document.findUnique({
            where: { id: documentId },
            select: { workspaceId: true },
        });
        if (!doc)
            return [];
        (0, workspace_access_helper_1.assertWorkspaceMembership)(user, doc.workspaceId);
        const logs = await this.prisma.auditLog.findMany({
            where: { entityId: documentId },
            include: { user: { select: USER_SELECT } },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return logs.map(this.toDto);
    }
    toDto(log) {
        return {
            id: log.id,
            workspaceId: log.workspaceId,
            userId: log.userId,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            metadata: log.metadata ?? null,
            createdAt: log.createdAt.toISOString(),
            user: log.user,
        };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map