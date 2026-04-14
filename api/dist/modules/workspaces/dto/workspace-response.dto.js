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
exports.WorkspaceSummaryDto = exports.WorkspaceDetailResponseDto = exports.WorkspaceResponseDto = exports.WorkspaceMemberDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class WorkspaceMemberDto {
}
exports.WorkspaceMemberDto = WorkspaceMemberDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WorkspaceMemberDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WorkspaceMemberDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WorkspaceMemberDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WorkspaceMemberDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WorkspaceMemberDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceUserRole }),
    __metadata("design:type", String)
], WorkspaceMemberDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceUserStatus }),
    __metadata("design:type", String)
], WorkspaceMemberDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], WorkspaceMemberDto.prototype, "joinedAt", void 0);
class WorkspaceResponseDto {
}
exports.WorkspaceResponseDto = WorkspaceResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WorkspaceResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WorkspaceResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WorkspaceResponseDto.prototype, "slug", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceType }),
    __metadata("design:type", String)
], WorkspaceResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceStatus }),
    __metadata("design:type", String)
], WorkspaceResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorkspaceResponseDto.prototype, "memberCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], WorkspaceResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], WorkspaceResponseDto.prototype, "updatedAt", void 0);
class WorkspaceDetailResponseDto extends WorkspaceResponseDto {
}
exports.WorkspaceDetailResponseDto = WorkspaceDetailResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorkspaceDetailResponseDto.prototype, "documentCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [WorkspaceMemberDto] }),
    __metadata("design:type", Array)
], WorkspaceDetailResponseDto.prototype, "members", void 0);
class WorkspaceSummaryDto {
}
exports.WorkspaceSummaryDto = WorkspaceSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorkspaceSummaryDto.prototype, "totalDocuments", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorkspaceSummaryDto.prototype, "activeDocuments", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorkspaceSummaryDto.prototype, "archivedDocuments", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorkspaceSummaryDto.prototype, "expiringCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorkspaceSummaryDto.prototype, "expiredCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorkspaceSummaryDto.prototype, "activeShares", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorkspaceSummaryDto.prototype, "memberCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorkspaceSummaryDto.prototype, "recentUploads", void 0);
//# sourceMappingURL=workspace-response.dto.js.map