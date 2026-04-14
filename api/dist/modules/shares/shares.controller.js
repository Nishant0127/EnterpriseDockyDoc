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
exports.ShareManagementController = exports.DocumentSharesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const dev_auth_guard_1 = require("../../common/guards/dev-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const shares_service_1 = require("./shares.service");
const share_dto_1 = require("./dto/share.dto");
let DocumentSharesController = class DocumentSharesController {
    constructor(sharesService) {
        this.sharesService = sharesService;
    }
    createInternalShare(id, dto, user) {
        return this.sharesService.createInternalShare(id, dto, user);
    }
    createExternalShare(id, dto, user) {
        return this.sharesService.createExternalShare(id, dto, user);
    }
    getShares(id, user) {
        return this.sharesService.getDocumentShares(id, user);
    }
};
exports.DocumentSharesController = DocumentSharesController;
__decorate([
    (0, common_1.Post)(':id/share/internal'),
    (0, swagger_1.ApiOperation)({ summary: 'Share document internally with workspace members' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document cuid' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: [share_dto_1.InternalShareDto] }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Document deleted or invalid users' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not a workspace member' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, share_dto_1.CreateInternalShareDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentSharesController.prototype, "createInternalShare", null);
__decorate([
    (0, common_1.Post)(':id/share/external'),
    (0, swagger_1.ApiOperation)({ summary: 'Create an external share link for a document' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document cuid' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: share_dto_1.ExternalShareDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Document deleted' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not a workspace member' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, share_dto_1.CreateExternalShareDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentSharesController.prototype, "createExternalShare", null);
__decorate([
    (0, common_1.Get)(':id/shares'),
    (0, swagger_1.ApiOperation)({ summary: 'List active shares for a document' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document cuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: share_dto_1.DocumentSharesResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not a workspace member' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentSharesController.prototype, "getShares", null);
exports.DocumentSharesController = DocumentSharesController = __decorate([
    (0, swagger_1.ApiTags)('Shares'),
    (0, common_1.Controller)('documents'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    __metadata("design:paramtypes", [shares_service_1.SharesService])
], DocumentSharesController);
let ShareManagementController = class ShareManagementController {
    constructor(sharesService) {
        this.sharesService = sharesService;
    }
    async revokeShare(shareId, user) {
        await this.sharesService.revokeShare(shareId, user);
        return { message: 'Share revoked successfully' };
    }
};
exports.ShareManagementController = ShareManagementController;
__decorate([
    (0, common_1.Post)(':shareId/revoke'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke a share (workspace members only)' }),
    (0, swagger_1.ApiParam)({ name: 'shareId', description: 'DocumentShare cuid' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not a workspace member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Share not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Share already revoked' }),
    __param(0, (0, common_1.Param)('shareId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShareManagementController.prototype, "revokeShare", null);
exports.ShareManagementController = ShareManagementController = __decorate([
    (0, swagger_1.ApiTags)('Shares'),
    (0, common_1.Controller)('shares'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    __metadata("design:paramtypes", [shares_service_1.SharesService])
], ShareManagementController);
//# sourceMappingURL=shares.controller.js.map