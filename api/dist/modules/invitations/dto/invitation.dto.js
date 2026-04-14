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
exports.AcceptInvitationResponseDto = exports.PublicInvitationDto = exports.InvitationResponseDto = exports.InvitationWorkspaceDto = exports.InvitationCreatedByDto = exports.CreateInvitationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateInvitationDto {
}
exports.CreateInvitationDto = CreateInvitationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email address of the person to invite' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateInvitationDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: client_1.WorkspaceUserRole,
        default: client_1.WorkspaceUserRole.VIEWER,
        description: 'Role to grant on acceptance',
    }),
    (0, class_validator_1.IsEnum)(client_1.WorkspaceUserRole),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInvitationDto.prototype, "role", void 0);
class InvitationCreatedByDto {
}
exports.InvitationCreatedByDto = InvitationCreatedByDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InvitationCreatedByDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InvitationCreatedByDto.prototype, "lastName", void 0);
class InvitationWorkspaceDto {
}
exports.InvitationWorkspaceDto = InvitationWorkspaceDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InvitationWorkspaceDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InvitationWorkspaceDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InvitationWorkspaceDto.prototype, "type", void 0);
class InvitationResponseDto {
}
exports.InvitationResponseDto = InvitationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InvitationResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InvitationResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceUserRole }),
    __metadata("design:type", String)
], InvitationResponseDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InvitationResponseDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], InvitationResponseDto.prototype, "expiresAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], InvitationResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: InvitationCreatedByDto }),
    __metadata("design:type", InvitationCreatedByDto)
], InvitationResponseDto.prototype, "createdBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], InvitationResponseDto.prototype, "createdAt", void 0);
class PublicInvitationDto {
}
exports.PublicInvitationDto = PublicInvitationDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicInvitationDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicInvitationDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceUserRole }),
    __metadata("design:type", String)
], PublicInvitationDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], PublicInvitationDto.prototype, "expiresAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: InvitationWorkspaceDto }),
    __metadata("design:type", InvitationWorkspaceDto)
], PublicInvitationDto.prototype, "workspace", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: InvitationCreatedByDto }),
    __metadata("design:type", InvitationCreatedByDto)
], PublicInvitationDto.prototype, "invitedBy", void 0);
class AcceptInvitationResponseDto {
}
exports.AcceptInvitationResponseDto = AcceptInvitationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AcceptInvitationResponseDto.prototype, "workspaceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AcceptInvitationResponseDto.prototype, "workspaceName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceUserRole }),
    __metadata("design:type", String)
], AcceptInvitationResponseDto.prototype, "role", void 0);
//# sourceMappingURL=invitation.dto.js.map