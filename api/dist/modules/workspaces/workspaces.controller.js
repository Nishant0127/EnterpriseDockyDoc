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
exports.WorkspacesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const dev_auth_guard_1 = require("../../common/guards/dev-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const workspaces_service_1 = require("./workspaces.service");
const workspace_response_dto_1 = require("./dto/workspace-response.dto");
const add_member_dto_1 = require("./dto/add-member.dto");
const ai_settings_dto_1 = require("./dto/ai-settings.dto");
let WorkspacesController = class WorkspacesController {
    constructor(workspacesService) {
        this.workspacesService = workspacesService;
    }
    findAll(user) {
        return this.workspacesService.findAll(user);
    }
    findOne(id, user) {
        return this.workspacesService.findById(id, user);
    }
    updateWorkspace(id, dto, user) {
        return this.workspacesService.update(id, dto, user);
    }
    getSummary(id, user) {
        return this.workspacesService.getSummary(id, user);
    }
    addMember(id, dto, user) {
        return this.workspacesService.addMember(id, dto, user);
    }
    updateMember(id, memberId, dto, user) {
        return this.workspacesService.updateMember(id, memberId, dto, user);
    }
    async removeMember(id, memberId, user) {
        await this.workspacesService.updateMember(id, memberId, { status: 'REMOVED' }, user);
    }
    getAiSettings(id, user) {
        return this.workspacesService.getAiSettings(id, user);
    }
    updateAiSettings(id, dto, user) {
        return this.workspacesService.updateAiSettings(id, dto, user);
    }
};
exports.WorkspacesController = WorkspacesController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'List workspaces the current user belongs to' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [workspace_response_dto_1.WorkspaceResponseDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WorkspacesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get workspace by ID (must be a member)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Workspace cuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: workspace_response_dto_1.WorkspaceDetailResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not a member of this workspace' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Workspace not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WorkspacesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Update workspace (rename). ADMIN/OWNER only.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Workspace cuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: workspace_response_dto_1.WorkspaceResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient role' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Workspace not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_member_dto_1.UpdateWorkspaceDto, Object]),
    __metadata("design:returntype", Promise)
], WorkspacesController.prototype, "updateWorkspace", null);
__decorate([
    (0, common_1.Get)(':id/summary'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get workspace dashboard summary stats' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Workspace cuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: workspace_response_dto_1.WorkspaceSummaryDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WorkspacesController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Post)(':id/members'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Add member to workspace (OWNER/ADMIN only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Workspace cuid' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: workspace_response_dto_1.WorkspaceMemberDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient role' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Workspace not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'User already an active member' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_member_dto_1.AddWorkspaceMemberDto, Object]),
    __metadata("design:returntype", Promise)
], WorkspacesController.prototype, "addMember", null);
__decorate([
    (0, common_1.Patch)(':id/members/:memberId'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Update workspace member role/status (OWNER/ADMIN only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Workspace cuid' }),
    (0, swagger_1.ApiParam)({ name: 'memberId', description: 'WorkspaceUser cuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: workspace_response_dto_1.WorkspaceMemberDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot remove last owner' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient role' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Member not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('memberId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, add_member_dto_1.UpdateWorkspaceMemberDto, Object]),
    __metadata("design:returntype", Promise)
], WorkspacesController.prototype, "updateMember", null);
__decorate([
    (0, common_1.Delete)(':id/members/:memberId'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, common_1.HttpCode)(204),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a workspace member (OWNER/ADMIN only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Workspace cuid' }),
    (0, swagger_1.ApiParam)({ name: 'memberId', description: 'WorkspaceUser cuid' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Member removed' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot remove last owner' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient role' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Member not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('memberId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WorkspacesController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Get)(':id/ai-settings'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get workspace AI configuration' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Workspace cuid' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WorkspacesController.prototype, "getAiSettings", null);
__decorate([
    (0, common_1.Patch)(':id/ai-settings'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Update workspace AI configuration. ADMIN/OWNER only.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Workspace cuid' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ai_settings_dto_1.UpdateAiSettingsDto, Object]),
    __metadata("design:returntype", Promise)
], WorkspacesController.prototype, "updateAiSettings", null);
exports.WorkspacesController = WorkspacesController = __decorate([
    (0, swagger_1.ApiTags)('Workspaces'),
    (0, common_1.Controller)('workspaces'),
    __metadata("design:paramtypes", [workspaces_service_1.WorkspacesService])
], WorkspacesController);
//# sourceMappingURL=workspaces.controller.js.map