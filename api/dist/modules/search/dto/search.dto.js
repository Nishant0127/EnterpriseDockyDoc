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
exports.SearchResultDto = exports.SearchTagDto = exports.SearchFolderDto = exports.SearchOwnerDto = exports.SearchQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class SearchQueryDto {
}
exports.SearchQueryDto = SearchQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Workspace to search within' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SearchQueryDto.prototype, "workspaceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Search query (name, description, tags, metadata, file content)',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], SearchQueryDto.prototype, "q", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: client_1.DocumentStatus,
        description: 'Filter by status (default excludes DELETED)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.DocumentStatus),
    __metadata("design:type", String)
], SearchQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Limit results to a specific folder' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchQueryDto.prototype, "folderId", void 0);
class SearchOwnerDto {
}
exports.SearchOwnerDto = SearchOwnerDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchOwnerDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchOwnerDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchOwnerDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchOwnerDto.prototype, "email", void 0);
class SearchFolderDto {
}
exports.SearchFolderDto = SearchFolderDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchFolderDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchFolderDto.prototype, "name", void 0);
class SearchTagDto {
}
exports.SearchTagDto = SearchTagDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchTagDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchTagDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], SearchTagDto.prototype, "color", void 0);
class SearchResultDto {
}
exports.SearchResultDto = SearchResultDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchResultDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchResultDto.prototype, "workspaceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchResultDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], SearchResultDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchResultDto.prototype, "fileName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SearchResultDto.prototype, "fileType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.DocumentStatus }),
    __metadata("design:type", String)
], SearchResultDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SearchResultDto.prototype, "currentVersionNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: SearchFolderDto }),
    __metadata("design:type", Object)
], SearchResultDto.prototype, "folder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: SearchOwnerDto }),
    __metadata("design:type", SearchOwnerDto)
], SearchResultDto.prototype, "owner", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [SearchTagDto] }),
    __metadata("design:type", Array)
], SearchResultDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SearchResultDto.prototype, "versionCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Short excerpt from extracted text showing where the match occurred',
    }),
    __metadata("design:type", String)
], SearchResultDto.prototype, "snippet", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], SearchResultDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], SearchResultDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=search.dto.js.map