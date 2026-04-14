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
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const documents_service_1 = require("./documents.service");
const document_dto_1 = require("./dto/document.dto");
const upload_document_dto_1 = require("./dto/upload-document.dto");
const dev_auth_guard_1 = require("../../common/guards/dev-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const audit_service_1 = require("../audit/audit.service");
const audit_dto_1 = require("../audit/dto/audit.dto");
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/json',
    'application/octet-stream',
]);
function uploadFileInterceptor() {
    return (0, platform_express_1.FileInterceptor)('file', {
        storage: undefined,
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: (_req, file, callback) => {
            if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
                callback(null, true);
            }
            else {
                callback(new common_1.BadRequestException(`File type "${file.mimetype}" is not allowed. ` +
                    `Accepted: PDF, Word, Excel, PowerPoint, images, text, CSV, ZIP, JSON.`), false);
            }
        },
    });
}
let DocumentsController = class DocumentsController {
    constructor(documentsService, auditService) {
        this.documentsService = documentsService;
        this.auditService = auditService;
    }
    findAll(query, user) {
        return this.documentsService.findAll(query, user);
    }
    uploadDocument(file, dto, user) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        return this.documentsService.upload(dto, file, user);
    }
    findOne(id, user) {
        return this.documentsService.findById(id, user);
    }
    async downloadLatest(id, user, res) {
        const { absolutePath, fileName, mimeType } = await this.documentsService.getDownloadInfo(id, user);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.sendFile(absolutePath, (err) => {
            if (err && !res.headersSent) {
                res.status(500).json({ message: 'Failed to stream file' });
            }
        });
    }
    async downloadVersion(id, versionNumber, user, res) {
        const { absolutePath, fileName, mimeType } = await this.documentsService.getVersionDownloadInfo(id, versionNumber, user);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.sendFile(absolutePath, (err) => {
            if (err && !res.headersSent) {
                res.status(500).json({ message: 'Failed to stream file' });
            }
        });
    }
    create(dto, user) {
        return this.documentsService.create(dto, user);
    }
    uploadVersion(id, file, dto, user) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        return this.documentsService.uploadVersion(id, file, dto, user);
    }
    update(id, dto, user) {
        return this.documentsService.update(id, dto, user);
    }
    deleteVersion(id, versionNumber, user) {
        return this.documentsService.deleteVersion(id, versionNumber, user);
    }
    setTags(id, dto, user) {
        return this.documentsService.setTags(id, dto, user);
    }
    setMetadata(id, dto, user) {
        return this.documentsService.setMetadata(id, dto.entries, user);
    }
    getReminders(id, user) {
        return this.documentsService.getReminders(id, user);
    }
    setReminders(id, dto, user) {
        return this.documentsService.setReminders(id, dto, user);
    }
    getActivity(id, user) {
        return this.auditService.getDocumentActivity(id, user);
    }
    remove(id, user) {
        return this.documentsService.softDelete(id, user);
    }
    async shred(id, user) {
        await this.documentsService.shred(id, user);
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List documents in a workspace' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [document_dto_1.DocumentListItemDto] }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [document_dto_1.DocumentQueryDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)(uploadFileInterceptor()),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a new document with file' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['file', 'workspaceId', 'name'],
            properties: {
                file: { type: 'string', format: 'binary' },
                workspaceId: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                folderId: { type: 'string' },
                tags: { type: 'string', description: 'Comma-separated tag IDs' },
                metadata: { type: 'string', description: 'JSON array of {key, value} objects' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, type: document_dto_1.DocumentDetailDto }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upload_document_dto_1.UploadDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get document detail by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document cuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: document_dto_1.DocumentDetailDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    (0, swagger_1.ApiOperation)({ summary: 'Download the latest version of a document' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'File stream' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document or file not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "downloadLatest", null);
__decorate([
    (0, common_1.Get)(':id/versions/:versionNumber/download'),
    (0, swagger_1.ApiOperation)({ summary: 'Download a specific version of a document' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiParam)({ name: 'versionNumber', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'File stream' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Version or file not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('versionNumber', common_1.ParseIntPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "downloadVersion", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a document record with placeholder version (no file)' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: document_dto_1.DocumentDetailDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [document_dto_1.CreateDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/versions'),
    (0, common_1.UseInterceptors)(uploadFileInterceptor()),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a new version of an existing document' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['file'],
            properties: {
                file: { type: 'string', format: 'binary' },
                notes: { type: 'string' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, type: document_dto_1.DocumentDetailDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, upload_document_dto_1.UploadVersionDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "uploadVersion", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update document fields' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: document_dto_1.DocumentListItemDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, document_dto_1.UpdateDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id/versions/:versionNumber'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a specific version of a document (cannot delete the only version)' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiParam)({ name: 'versionNumber', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, type: document_dto_1.DocumentDetailDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot delete the only version' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document or version not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('versionNumber', common_1.ParseIntPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "deleteVersion", null);
__decorate([
    (0, common_1.Put)(':id/tags'),
    (0, swagger_1.ApiOperation)({ summary: 'Set tags for a document (replaces all existing tags)' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated tag list' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Editor role or above required' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, document_dto_1.SetDocumentTagsDto, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "setTags", null);
__decorate([
    (0, common_1.Put)(':id/metadata'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Set metadata for a document (upserts entries, removes unlisted keys)' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated metadata list' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, document_dto_1.SetDocumentMetadataDto, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "setMetadata", null);
__decorate([
    (0, common_1.Get)(':id/reminders'),
    (0, swagger_1.ApiOperation)({ summary: 'Get reminders for a document' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [document_dto_1.DocumentReminderDto] }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getReminders", null);
__decorate([
    (0, common_1.Put)(':id/reminders'),
    (0, swagger_1.ApiOperation)({ summary: 'Set reminders for a document (replaces existing PENDING reminders)' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [document_dto_1.DocumentReminderDto] }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, document_dto_1.SetDocumentRemindersDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "setReminders", null);
__decorate([
    (0, common_1.Get)(':id/activity'),
    (0, swagger_1.ApiOperation)({ summary: 'Get audit activity for a document' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [audit_dto_1.AuditLogDto] }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getActivity", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Soft delete a document (status → DELETED)' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/shred'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Permanently delete a soft-deleted document and its files (ADMIN/OWNER only)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Document permanently deleted' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Document must be soft-deleted first' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient role' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "shred", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, swagger_1.ApiTags)('Documents'),
    (0, common_1.Controller)('documents'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService,
        audit_service_1.AuditService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map