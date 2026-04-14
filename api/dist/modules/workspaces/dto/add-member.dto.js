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
exports.UpdateWorkspaceMemberDto = exports.AddWorkspaceMemberDto = exports.UpdateWorkspaceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class UpdateWorkspaceDto {
}
exports.UpdateWorkspaceDto = UpdateWorkspaceDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'New workspace name', maxLength: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateWorkspaceDto.prototype, "name", void 0);
class AddWorkspaceMemberDto {
}
exports.AddWorkspaceMemberDto = AddWorkspaceMemberDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email address — creates user if not found' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], AddWorkspaceMemberDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddWorkspaceMemberDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddWorkspaceMemberDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceUserRole }),
    (0, class_validator_1.IsEnum)(client_1.WorkspaceUserRole),
    __metadata("design:type", String)
], AddWorkspaceMemberDto.prototype, "role", void 0);
class UpdateWorkspaceMemberDto {
}
exports.UpdateWorkspaceMemberDto = UpdateWorkspaceMemberDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.WorkspaceUserRole }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.WorkspaceUserRole),
    __metadata("design:type", String)
], UpdateWorkspaceMemberDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.WorkspaceUserStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.WorkspaceUserStatus),
    __metadata("design:type", String)
], UpdateWorkspaceMemberDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Update the member\'s first name (global profile)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateWorkspaceMemberDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Update the member\'s last name (global profile)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateWorkspaceMemberDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Update the member\'s email address (global profile)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateWorkspaceMemberDto.prototype, "email", void 0);
//# sourceMappingURL=add-member.dto.js.map