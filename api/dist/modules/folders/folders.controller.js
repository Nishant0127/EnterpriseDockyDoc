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
exports.FoldersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const folders_service_1 = require("./folders.service");
const folder_dto_1 = require("./dto/folder.dto");
const dev_auth_guard_1 = require("../../common/guards/dev-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let FoldersController = class FoldersController {
    constructor(foldersService) {
        this.foldersService = foldersService;
    }
    findAll(query, deleted, user) {
        if (deleted === 'true') {
            return this.foldersService.findDeleted(query.workspaceId, user);
        }
        return this.foldersService.findAll(query.workspaceId, user);
    }
    findOne(id, user) {
        return this.foldersService.findById(id, user);
    }
    create(dto, user) {
        return this.foldersService.create(dto, user);
    }
    rename(id, dto, user) {
        return this.foldersService.rename(id, dto, user);
    }
    async restore(id, user) {
        return this.foldersService.restore(id, user);
    }
    async delete(id, user) {
        return this.foldersService.delete(id, user);
    }
};
exports.FoldersController = FoldersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List folders in a workspace (active or deleted)' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [folder_dto_1.FolderResponseDto] }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('deleted')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [folder_dto_1.FolderQueryDto, String, Object]),
    __metadata("design:returntype", Promise)
], FoldersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get folder by ID with children' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: folder_dto_1.FolderDetailResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Folder not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FoldersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a folder' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: folder_dto_1.FolderResponseDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [folder_dto_1.CreateFolderDto, Object]),
    __metadata("design:returntype", Promise)
], FoldersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Rename a folder' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: folder_dto_1.FolderResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Folder not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, folder_dto_1.UpdateFolderDto, Object]),
    __metadata("design:returntype", Promise)
], FoldersController.prototype, "rename", null);
__decorate([
    (0, common_1.Post)(':id/restore'),
    (0, common_1.HttpCode)(204),
    (0, swagger_1.ApiOperation)({ summary: 'Restore a soft-deleted folder and its contents' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Folder restored' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FoldersController.prototype, "restore", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(204),
    (0, swagger_1.ApiOperation)({ summary: 'Soft-delete a folder and all its contents' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Folder moved to trash' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FoldersController.prototype, "delete", null);
exports.FoldersController = FoldersController = __decorate([
    (0, swagger_1.ApiTags)('Folders'),
    (0, common_1.Controller)('folders'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    __metadata("design:paramtypes", [folders_service_1.FoldersService])
], FoldersController);
//# sourceMappingURL=folders.controller.js.map