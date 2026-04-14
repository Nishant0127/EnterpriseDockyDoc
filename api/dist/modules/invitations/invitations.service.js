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
exports.InvitationsService = void 0;
const crypto = require("crypto");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const workspace_access_helper_1 = require("../../common/helpers/workspace-access.helper");
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let InvitationsService = class InvitationsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(workspaceId, dto, actor) {
        (0, workspace_access_helper_1.assertAdminOrAbove)(actor, workspaceId);
        const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
        if (!ws)
            throw new common_1.NotFoundException('Workspace not found');
        const email = dto.email.toLowerCase().trim();
        const role = dto.role ?? client_1.WorkspaceUserRole.VIEWER;
        const existingMember = await this.prisma.workspaceUser.findFirst({
            where: { workspaceId, status: 'ACTIVE', user: { email } },
        });
        if (existingMember) {
            throw new common_1.ConflictException(`${email} is already an active member of this workspace.`);
        }
        const existingInvite = await this.prisma.workspaceInvitation.findFirst({
            where: { workspaceId, email, status: 'PENDING', expiresAt: { gt: new Date() } },
            include: { createdBy: true },
        });
        if (existingInvite) {
            return this.toResponseDto(existingInvite);
        }
        const invite = await this.prisma.workspaceInvitation.create({
            data: {
                workspaceId,
                email,
                role,
                token: crypto.randomBytes(32).toString('hex'),
                expiresAt: new Date(Date.now() + INVITE_TTL_MS),
                createdById: actor.id,
            },
            include: { createdBy: true },
        });
        return this.toResponseDto(invite);
    }
    async listPending(workspaceId, actor) {
        (0, workspace_access_helper_1.assertAdminOrAbove)(actor, workspaceId);
        await this.prisma.workspaceInvitation.updateMany({
            where: { workspaceId, status: 'PENDING', expiresAt: { lte: new Date() } },
            data: { status: 'EXPIRED' },
        });
        const invites = await this.prisma.workspaceInvitation.findMany({
            where: { workspaceId, status: 'PENDING' },
            include: { createdBy: true },
            orderBy: { createdAt: 'desc' },
        });
        return invites.map((i) => this.toResponseDto(i));
    }
    async revoke(workspaceId, inviteId, actor) {
        (0, workspace_access_helper_1.assertAdminOrAbove)(actor, workspaceId);
        const invite = await this.prisma.workspaceInvitation.findFirst({
            where: { id: inviteId, workspaceId },
        });
        if (!invite)
            throw new common_1.NotFoundException('Invitation not found');
        if (invite.status !== 'PENDING') {
            throw new common_1.BadRequestException('Only PENDING invitations can be revoked');
        }
        await this.prisma.workspaceInvitation.update({
            where: { id: inviteId },
            data: { status: 'REVOKED' },
        });
    }
    async getByToken(token) {
        const invite = await this.prisma.workspaceInvitation.findUnique({
            where: { token },
            include: {
                workspace: true,
                createdBy: true,
            },
        });
        if (!invite)
            throw new common_1.NotFoundException('Invitation not found or already used');
        if (invite.status === 'ACCEPTED')
            throw new common_1.GoneException('This invitation has already been accepted');
        if (invite.status === 'REVOKED')
            throw new common_1.GoneException('This invitation has been revoked');
        if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
            throw new common_1.GoneException('This invitation has expired');
        }
        return {
            id: invite.id,
            email: invite.email,
            role: invite.role,
            expiresAt: invite.expiresAt,
            workspace: { id: invite.workspace.id, name: invite.workspace.name, type: invite.workspace.type },
            invitedBy: { firstName: invite.createdBy.firstName, lastName: invite.createdBy.lastName },
        };
    }
    async accept(token, actor) {
        const invite = await this.prisma.workspaceInvitation.findUnique({
            where: { token },
            include: { workspace: true },
        });
        if (!invite)
            throw new common_1.NotFoundException('Invitation not found');
        if (invite.status === 'ACCEPTED')
            throw new common_1.ConflictException('This invitation has already been accepted');
        if (invite.status === 'REVOKED')
            throw new common_1.GoneException('This invitation has been revoked');
        if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
            throw new common_1.GoneException('This invitation has expired');
        }
        if (actor.email.toLowerCase() !== invite.email.toLowerCase()) {
            throw new common_1.ForbiddenException(`This invitation was sent to ${invite.email}. Please sign in with that account.`);
        }
        const existingMembership = await this.prisma.workspaceUser.findUnique({
            where: { userId_workspaceId: { userId: actor.id, workspaceId: invite.workspaceId } },
        });
        if (existingMembership) {
            if (existingMembership.status === client_1.WorkspaceUserStatus.ACTIVE) {
                await this.prisma.workspaceInvitation.update({
                    where: { id: invite.id },
                    data: { status: 'ACCEPTED', acceptedById: actor.id },
                });
                return {
                    workspaceId: invite.workspaceId,
                    workspaceName: invite.workspace.name,
                    role: existingMembership.role,
                };
            }
            await this.prisma.workspaceUser.update({
                where: { id: existingMembership.id },
                data: { status: client_1.WorkspaceUserStatus.ACTIVE, role: invite.role },
            });
        }
        else {
            await this.prisma.workspaceUser.create({
                data: {
                    userId: actor.id,
                    workspaceId: invite.workspaceId,
                    role: invite.role,
                    status: client_1.WorkspaceUserStatus.ACTIVE,
                },
            });
        }
        await this.prisma.workspaceInvitation.update({
            where: { id: invite.id },
            data: { status: 'ACCEPTED', acceptedById: actor.id },
        });
        return {
            workspaceId: invite.workspaceId,
            workspaceName: invite.workspace.name,
            role: invite.role,
        };
    }
    toResponseDto(invite) {
        return {
            id: invite.id,
            email: invite.email,
            role: invite.role,
            token: invite.token,
            expiresAt: invite.expiresAt,
            status: invite.status,
            createdBy: { firstName: invite.createdBy.firstName, lastName: invite.createdBy.lastName },
            createdAt: invite.createdAt,
        };
    }
};
exports.InvitationsService = InvitationsService;
exports.InvitationsService = InvitationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InvitationsService);
//# sourceMappingURL=invitations.service.js.map