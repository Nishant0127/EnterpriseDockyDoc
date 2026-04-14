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
exports.RemindersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const dev_auth_guard_1 = require("../../common/guards/dev-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const reminders_service_1 = require("./reminders.service");
const reminder_query_dto_1 = require("./dto/reminder-query.dto");
let RemindersController = class RemindersController {
    constructor(remindersService) {
        this.remindersService = remindersService;
    }
    getReminders(query, user) {
        return this.remindersService.getWorkspaceReminders(query.workspaceId, user);
    }
    getExpiring(query, user) {
        return this.remindersService.getExpiringDocuments(query.workspaceId, user);
    }
};
exports.RemindersController = RemindersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List pending reminders for a workspace' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [reminder_query_dto_1.UpcomingReminderDto] }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reminder_query_dto_1.ReminderQueryDto, Object]),
    __metadata("design:returntype", Promise)
], RemindersController.prototype, "getReminders", null);
__decorate([
    (0, common_1.Get)('expiring'),
    (0, swagger_1.ApiOperation)({ summary: 'List expiring/expired documents in a workspace (90-day window)' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [reminder_query_dto_1.ExpiringDocumentDto] }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reminder_query_dto_1.ReminderQueryDto, Object]),
    __metadata("design:returntype", Promise)
], RemindersController.prototype, "getExpiring", null);
exports.RemindersController = RemindersController = __decorate([
    (0, swagger_1.ApiTags)('Reminders'),
    (0, common_1.Controller)('reminders'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    __metadata("design:paramtypes", [reminders_service_1.RemindersService])
], RemindersController);
//# sourceMappingURL=reminders.controller.js.map