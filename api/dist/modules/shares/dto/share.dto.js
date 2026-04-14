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
exports.ShareType = exports.SharePermission = exports.VerifyShareResponseDto = exports.PublicShareInfoDto = exports.DocumentSharesResponseDto = exports.ExternalShareDto = exports.InternalShareDto = exports.ShareUserDto = exports.VerifySharePasswordDto = exports.CreateExternalShareDto = exports.CreateInternalShareDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "SharePermission", { enumerable: true, get: function () { return client_1.SharePermission; } });
Object.defineProperty(exports, "ShareType", { enumerable: true, get: function () { return client_1.ShareType; } });
class CreateInternalShareDto {
}
exports.CreateInternalShareDto = CreateInternalShareDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String], description: 'User IDs to share with' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsNotEmpty)({ each: true }),
    __metadata("design:type", Array)
], CreateInternalShareDto.prototype, "userIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.SharePermission }),
    (0, class_validator_1.IsEnum)(client_1.SharePermission),
    __metadata("design:type", String)
], CreateInternalShareDto.prototype, "permission", void 0);
class CreateExternalShareDto {
}
exports.CreateExternalShareDto = CreateExternalShareDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ISO date string — when the link expires' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateExternalShareDto.prototype, "expiresAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Password to protect the link (min 4 chars)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(4),
    __metadata("design:type", String)
], CreateExternalShareDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the link allows file download', default: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateExternalShareDto.prototype, "allowDownload", void 0);
class VerifySharePasswordDto {
}
exports.VerifySharePasswordDto = VerifySharePasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], VerifySharePasswordDto.prototype, "password", void 0);
class ShareUserDto {
}
exports.ShareUserDto = ShareUserDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ShareUserDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ShareUserDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ShareUserDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ShareUserDto.prototype, "email", void 0);
class InternalShareDto {
}
exports.InternalShareDto = InternalShareDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InternalShareDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InternalShareDto.prototype, "shareId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ShareUserDto }),
    __metadata("design:type", ShareUserDto)
], InternalShareDto.prototype, "sharedWith", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.SharePermission }),
    __metadata("design:type", String)
], InternalShareDto.prototype, "permission", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InternalShareDto.prototype, "createdAt", void 0);
class ExternalShareDto {
}
exports.ExternalShareDto = ExternalShareDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExternalShareDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExternalShareDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ExternalShareDto.prototype, "expiresAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ExternalShareDto.prototype, "allowDownload", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ExternalShareDto.prototype, "hasPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ExternalShareDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExternalShareDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ShareUserDto }),
    __metadata("design:type", ShareUserDto)
], ExternalShareDto.prototype, "createdBy", void 0);
class DocumentSharesResponseDto {
}
exports.DocumentSharesResponseDto = DocumentSharesResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [InternalShareDto] }),
    __metadata("design:type", Array)
], DocumentSharesResponseDto.prototype, "internalShares", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ExternalShareDto] }),
    __metadata("design:type", Array)
], DocumentSharesResponseDto.prototype, "externalShares", void 0);
class PublicShareInfoDto {
}
exports.PublicShareInfoDto = PublicShareInfoDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicShareInfoDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicShareInfoDto.prototype, "documentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicShareInfoDto.prototype, "documentName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], PublicShareInfoDto.prototype, "allowDownload", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], PublicShareInfoDto.prototype, "expiresAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], PublicShareInfoDto.prototype, "requiresPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ShareType }),
    __metadata("design:type", String)
], PublicShareInfoDto.prototype, "shareType", void 0);
class VerifyShareResponseDto {
}
exports.VerifyShareResponseDto = VerifyShareResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], VerifyShareResponseDto.prototype, "accessGrant", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], VerifyShareResponseDto.prototype, "expiresIn", void 0);
//# sourceMappingURL=share.dto.js.map