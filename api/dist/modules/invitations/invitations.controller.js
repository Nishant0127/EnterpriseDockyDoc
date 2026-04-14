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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const dev_auth_guard_1 = require("../../common/guards/dev-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const invitations_service_1 = require("./invitations.service");
const invitation_dto_1 = require("./dto/invitation.dto");
let InvitationsController = class InvitationsController {
    constructor(invitationsService) {
        this.invitationsService = invitationsService;
    }
    createInvitation(workspaceId, dto, user) {
        return this.invitationsService.create(workspaceId, dto, user);
    }
    listInvitations(workspaceId, user) {
        return this.invitationsService.listPending(workspaceId, user);
    }
    async revokeInvitation(workspaceId, inviteId, user) {
        await this.invitationsService.revoke(workspaceId, inviteId, user);
    }
    getInvitation(token) {
        return this.invitationsService.getByToken(token);
    }
    acceptInvitation(token, user) {
        return this.invitationsService.accept(token, user);
    }
};
exports.InvitationsController = InvitationsController;
__decorate([
    (0, common_1.Post)('workspaces/:id/invitations'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Create workspace invitation (ADMIN/OWNER only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Workspace cuid' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Invitation created' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Already an active member or pending invite exists' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, invitation_dto_1.CreateInvitationDto, Object]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "createInvitation", null);
__decorate([
    (0, common_1.Get)('workspaces/:id/invitations'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'List pending invitations for a workspace (ADMIN/OWNER only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Workspace cuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of pending invitations' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "listInvitations", null);
__decorate([
    (0, common_1.Delete)('workspaces/:id/invitations/:inviteId'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, common_1.HttpCode)(204),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke a pending invitation (ADMIN/OWNER only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Workspace cuid' }),
    (0, swagger_1.ApiParam)({ name: 'inviteId', description: 'Invitation cuid' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Invitation revoked' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Invitation not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('inviteId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "revokeInvitation", null);
__decorate([
    (0, common_1.Get)('join/:token'),
    (0, swagger_1.ApiOperation)({ summary: 'Get invitation details by token (public)' }),
    (0, swagger_1.ApiParam)({ name: 'token', description: 'Invitation token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Invitation details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Token not found' }),
    (0, swagger_1.ApiResponse)({ status: 410, description: 'Invitation expired, revoked, or already accepted' }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "getInvitation", null);
__decorate([
    (0, common_1.Post)('join/:token'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Accept workspace invitation (auth required)' }),
    (0, swagger_1.ApiParam)({ name: 'token', description: 'Invitation token' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Invitation accepted, membership created' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Email mismatch' }),
    (0, swagger_1.ApiResponse)({ status: 410, description: 'Invitation expired, revoked, or already accepted' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvitationsController.prototype, "acceptInvitation", null);
exports.InvitationsController = InvitationsController = __decorate([
    (0, swagger_1.ApiTags)('Invitations'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [invitations_service_1.InvitationsService])
], InvitationsController);
//# sourceMappingURL=invitations.controller.js.map