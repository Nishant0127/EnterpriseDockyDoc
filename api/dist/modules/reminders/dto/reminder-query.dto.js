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
exports.UpcomingReminderDto = exports.ExpiringDocumentDto = exports.ReminderQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class ReminderQueryDto {
}
exports.ReminderQueryDto = ReminderQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Workspace ID (required)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ReminderQueryDto.prototype, "workspaceId", void 0);
class ExpiringDocumentDto {
}
exports.ExpiringDocumentDto = ExpiringDocumentDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExpiringDocumentDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExpiringDocumentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExpiringDocumentDto.prototype, "workspaceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ExpiringDocumentDto.prototype, "expiryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ExpiringDocumentDto.prototype, "renewalDueDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ExpiringDocumentDto.prototype, "isReminderEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ExpiringDocumentDto.prototype, "folderName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExpiringDocumentDto.prototype, "ownerEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ExpiringDocumentDto.prototype, "daysUntilExpiry", void 0);
class UpcomingReminderDto {
}
exports.UpcomingReminderDto = UpcomingReminderDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UpcomingReminderDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UpcomingReminderDto.prototype, "documentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UpcomingReminderDto.prototype, "documentName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], UpcomingReminderDto.prototype, "remindAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ReminderChannel }),
    __metadata("design:type", String)
], UpcomingReminderDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ReminderStatus }),
    __metadata("design:type", String)
], UpcomingReminderDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], UpcomingReminderDto.prototype, "expiryDate", void 0);
//# sourceMappingURL=reminder-query.dto.js.map