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
exports.AuditLogDto = exports.AuditUserDto = exports.AuditQueryDto = exports.AuditEntityType = exports.AuditAction = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_validator_2 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "AuditAction", { enumerable: true, get: function () { return client_1.AuditAction; } });
Object.defineProperty(exports, "AuditEntityType", { enumerable: true, get: function () { return client_1.AuditEntityType; } });
class AuditQueryDto {
    constructor() {
        this.limit = 50;
        this.offset = 0;
    }
}
exports.AuditQueryDto = AuditQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Workspace to scope the activity feed' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AuditQueryDto.prototype, "workspaceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.AuditEntityType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.AuditEntityType),
    __metadata("design:type", String)
], AuditQueryDto.prototype, "entityType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.AuditAction }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.AuditAction),
    __metadata("design:type", String)
], AuditQueryDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 50 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(200),
    __metadata("design:type", Number)
], AuditQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 0, description: 'Number of records to skip (for Load More pagination)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AuditQueryDto.prototype, "offset", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter records created on or after this ISO-8601 timestamp' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_2.IsISO8601)(),
    __metadata("design:type", String)
], AuditQueryDto.prototype, "dateFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter records created on or before this ISO-8601 timestamp' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_2.IsISO8601)(),
    __metadata("design:type", String)
], AuditQueryDto.prototype, "dateTo", void 0);
class AuditUserDto {
}
exports.AuditUserDto = AuditUserDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AuditUserDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AuditUserDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AuditUserDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AuditUserDto.prototype, "email", void 0);
class AuditLogDto {
}
exports.AuditLogDto = AuditLogDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AuditLogDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AuditLogDto.prototype, "workspaceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], AuditLogDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.AuditAction }),
    __metadata("design:type", String)
], AuditLogDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.AuditEntityType }),
    __metadata("design:type", String)
], AuditLogDto.prototype, "entityType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AuditLogDto.prototype, "entityId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], AuditLogDto.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AuditLogDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, type: AuditUserDto }),
    __metadata("design:type", Object)
], AuditLogDto.prototype, "user", void 0);
//# sourceMappingURL=audit.dto.js.map