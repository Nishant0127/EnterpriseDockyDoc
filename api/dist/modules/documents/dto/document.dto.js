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
exports.ReminderStatus = exports.ReminderChannel = exports.SetDocumentTagsDto = exports.DocumentDetailDto = exports.DocumentListItemDto = exports.DocumentMetadataDto = exports.DocumentVersionDto = exports.DocTagRefDto = exports.DocFolderRefDto = exports.DocOwnerDto = exports.SetDocumentRemindersDto = exports.DocumentReminderDto = exports.SetDocumentMetadataDto = exports.MetadataEntryDto = exports.UpdateDocumentDto = exports.CreateDocumentDto = exports.DocumentQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "ReminderChannel", { enumerable: true, get: function () { return client_1.ReminderChannel; } });
Object.defineProperty(exports, "ReminderStatus", { enumerable: true, get: function () { return client_1.ReminderStatus; } });
class DocumentQueryDto {
}
exports.DocumentQueryDto = DocumentQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Workspace ID (required)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DocumentQueryDto.prototype, "workspaceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by folder ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DocumentQueryDto.prototype, "folderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.DocumentStatus, description: 'Filter by status (default excludes DELETED)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.DocumentStatus),
    __metadata("design:type", String)
], DocumentQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by owner user ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DocumentQueryDto.prototype, "ownerUserId", void 0);
class CreateDocumentDto {
}
exports.CreateDocumentDto = CreateDocumentDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "workspaceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "fileName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'File extension (pdf, docx, xlsx…)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "fileType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'MIME type for the initial version' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Owner user ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "ownerUserId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Place document in this folder' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "folderId", void 0);
class UpdateDocumentDto {
}
exports.UpdateDocumentDto = UpdateDocumentDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDocumentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDocumentDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.folderId !== null),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateDocumentDto.prototype, "folderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.DocumentStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.DocumentStatus),
    __metadata("design:type", String)
], UpdateDocumentDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'ISO date string or null to clear' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.expiryDate !== null),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdateDocumentDto.prototype, "expiryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.renewalDueDate !== null),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdateDocumentDto.prototype, "renewalDueDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDocumentDto.prototype, "isReminderEnabled", void 0);
class MetadataEntryDto {
}
exports.MetadataEntryDto = MetadataEntryDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], MetadataEntryDto.prototype, "key", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MetadataEntryDto.prototype, "value", void 0);
class SetDocumentMetadataDto {
}
exports.SetDocumentMetadataDto = SetDocumentMetadataDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [MetadataEntryDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MetadataEntryDto),
    __metadata("design:type", Array)
], SetDocumentMetadataDto.prototype, "entries", void 0);
class DocumentReminderDto {
}
exports.DocumentReminderDto = DocumentReminderDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentReminderDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentReminderDto.prototype, "documentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], DocumentReminderDto.prototype, "remindAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ReminderChannel }),
    __metadata("design:type", String)
], DocumentReminderDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ReminderStatus }),
    __metadata("design:type", String)
], DocumentReminderDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], DocumentReminderDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], DocumentReminderDto.prototype, "updatedAt", void 0);
class SetDocumentRemindersDto {
}
exports.SetDocumentRemindersDto = SetDocumentRemindersDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'ISO date string or null to clear' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.expiryDate !== null),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], SetDocumentRemindersDto.prototype, "expiryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.renewalDueDate !== null),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], SetDocumentRemindersDto.prototype, "renewalDueDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SetDocumentRemindersDto.prototype, "isReminderEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Days before expiry to remind (e.g. [30, 15, 7, 1]). Each value must be 1–365.',
        type: [Number],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    (0, class_validator_1.Max)(365, { each: true }),
    __metadata("design:type", Array)
], SetDocumentRemindersDto.prototype, "offsetDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.ReminderChannel }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.ReminderChannel),
    __metadata("design:type", String)
], SetDocumentRemindersDto.prototype, "channel", void 0);
class DocOwnerDto {
}
exports.DocOwnerDto = DocOwnerDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocOwnerDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocOwnerDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocOwnerDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocOwnerDto.prototype, "email", void 0);
class DocFolderRefDto {
}
exports.DocFolderRefDto = DocFolderRefDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocFolderRefDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocFolderRefDto.prototype, "name", void 0);
class DocTagRefDto {
}
exports.DocTagRefDto = DocTagRefDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocTagRefDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocTagRefDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], DocTagRefDto.prototype, "color", void 0);
class DocumentVersionDto {
}
exports.DocumentVersionDto = DocumentVersionDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentVersionDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DocumentVersionDto.prototype, "versionNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentVersionDto.prototype, "storageKey", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'File size in bytes (serialized as string for BigInt safety)' }),
    __metadata("design:type", String)
], DocumentVersionDto.prototype, "fileSizeBytes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentVersionDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: DocOwnerDto }),
    __metadata("design:type", DocOwnerDto)
], DocumentVersionDto.prototype, "uploadedBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], DocumentVersionDto.prototype, "createdAt", void 0);
class DocumentMetadataDto {
}
exports.DocumentMetadataDto = DocumentMetadataDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentMetadataDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentMetadataDto.prototype, "key", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentMetadataDto.prototype, "value", void 0);
class DocumentListItemDto {
}
exports.DocumentListItemDto = DocumentListItemDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentListItemDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentListItemDto.prototype, "workspaceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentListItemDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentListItemDto.prototype, "fileName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentListItemDto.prototype, "fileType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.DocumentStatus }),
    __metadata("design:type", String)
], DocumentListItemDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DocumentListItemDto.prototype, "currentVersionNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: DocFolderRefDto }),
    __metadata("design:type", Object)
], DocumentListItemDto.prototype, "folder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: DocOwnerDto }),
    __metadata("design:type", DocOwnerDto)
], DocumentListItemDto.prototype, "owner", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [DocTagRefDto] }),
    __metadata("design:type", Array)
], DocumentListItemDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DocumentListItemDto.prototype, "versionCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], DocumentListItemDto.prototype, "expiryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], DocumentListItemDto.prototype, "renewalDueDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], DocumentListItemDto.prototype, "isReminderEnabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], DocumentListItemDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], DocumentListItemDto.prototype, "updatedAt", void 0);
class DocumentDetailDto extends DocumentListItemDto {
}
exports.DocumentDetailDto = DocumentDetailDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], DocumentDetailDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], DocumentDetailDto.prototype, "workspace", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [DocumentVersionDto] }),
    __metadata("design:type", Array)
], DocumentDetailDto.prototype, "versions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [DocumentMetadataDto] }),
    __metadata("design:type", Array)
], DocumentDetailDto.prototype, "metadata", void 0);
class SetDocumentTagsDto {
}
exports.SetDocumentTagsDto = SetDocumentTagsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tag IDs to assign (replaces all existing tags)', type: [String] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], SetDocumentTagsDto.prototype, "tagIds", void 0);
//# sourceMappingURL=document.dto.js.map