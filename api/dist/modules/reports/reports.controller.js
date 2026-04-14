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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reports_service_1 = require("./reports.service");
const dev_auth_guard_1 = require("../../common/guards/dev-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const class_validator_2 = require("class-validator");
class ReportQueryDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ReportQueryDto.prototype, "workspaceId", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsInt)(),
    (0, class_validator_2.Min)(1),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    __metadata("design:type", Number)
], ReportQueryDto.prototype, "days", void 0);
let ReportsController = class ReportsController {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    expiringDocuments(q, user) {
        return this.reportsService.getExpiringDocuments(q.workspaceId, user, q.days ?? 30);
    }
    documentActivity(q, user) {
        return this.reportsService.getDocumentActivity(q.workspaceId, user, q.days ?? 30);
    }
    storageUsage(q, user) {
        return this.reportsService.getStorageUsage(q.workspaceId, user);
    }
    memberActivity(q, user) {
        return this.reportsService.getMemberActivity(q.workspaceId, user, q.days ?? 30);
    }
    tagCoverage(q, user) {
        return this.reportsService.getTagCoverage(q.workspaceId, user);
    }
    complianceExposure(q, user) {
        return this.reportsService.getComplianceExposure(q.workspaceId, user);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('expiring-documents'),
    (0, swagger_1.ApiOperation)({ summary: 'Documents expiring within N days' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ReportQueryDto, Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "expiringDocuments", null);
__decorate([
    (0, common_1.Get)('document-activity'),
    (0, swagger_1.ApiOperation)({ summary: 'Document activity over last N days' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ReportQueryDto, Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "documentActivity", null);
__decorate([
    (0, common_1.Get)('storage-usage'),
    (0, swagger_1.ApiOperation)({ summary: 'Storage usage by document type' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ReportQueryDto, Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "storageUsage", null);
__decorate([
    (0, common_1.Get)('member-activity'),
    (0, swagger_1.ApiOperation)({ summary: 'Member activity over last N days' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ReportQueryDto, Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "memberActivity", null);
__decorate([
    (0, common_1.Get)('tag-coverage'),
    (0, swagger_1.ApiOperation)({ summary: 'Tag coverage across documents' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ReportQueryDto, Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "tagCoverage", null);
__decorate([
    (0, common_1.Get)('compliance-exposure'),
    (0, swagger_1.ApiOperation)({ summary: 'Compliance exposure summary' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ReportQueryDto, Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "complianceExposure", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('Reports'),
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map