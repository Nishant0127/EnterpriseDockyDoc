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
exports.SwitchWorkspaceResponseDto = exports.MeResponseDto = exports.WorkspaceMembershipDto = exports.SwitchWorkspaceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class SwitchWorkspaceDto {
}
exports.SwitchWorkspaceDto = SwitchWorkspaceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID of the workspace to switch to' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SwitchWorkspaceDto.prototype, "workspaceId", void 0);
class WorkspaceMembershipDto {
}
exports.WorkspaceMembershipDto = WorkspaceMembershipDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WorkspaceMembershipDto.prototype, "workspaceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WorkspaceMembershipDto.prototype, "workspaceName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WorkspaceMembershipDto.prototype, "workspaceSlug", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceType }),
    __metadata("design:type", String)
], WorkspaceMembershipDto.prototype, "workspaceType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceUserRole }),
    __metadata("design:type", String)
], WorkspaceMembershipDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceUserStatus }),
    __metadata("design:type", String)
], WorkspaceMembershipDto.prototype, "status", void 0);
class MeResponseDto {
}
exports.MeResponseDto = MeResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MeResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MeResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MeResponseDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MeResponseDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], MeResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [WorkspaceMembershipDto] }),
    __metadata("design:type", Array)
], MeResponseDto.prototype, "workspaces", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: WorkspaceMembershipDto, nullable: true }),
    __metadata("design:type", Object)
], MeResponseDto.prototype, "defaultWorkspace", void 0);
class SwitchWorkspaceResponseDto {
}
exports.SwitchWorkspaceResponseDto = SwitchWorkspaceResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SwitchWorkspaceResponseDto.prototype, "workspaceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SwitchWorkspaceResponseDto.prototype, "workspaceName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SwitchWorkspaceResponseDto.prototype, "workspaceSlug", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceType }),
    __metadata("design:type", String)
], SwitchWorkspaceResponseDto.prototype, "workspaceType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.WorkspaceUserRole }),
    __metadata("design:type", String)
], SwitchWorkspaceResponseDto.prototype, "role", void 0);
//# sourceMappingURL=auth.dto.js.map