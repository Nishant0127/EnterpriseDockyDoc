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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const auth_service_1 = require("./auth.service");
const dev_auth_guard_1 = require("../../common/guards/dev-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const auth_dto_1 = require("./dto/auth.dto");
class LoginDto {
}
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
const DEV_HEADER = (0, swagger_1.ApiHeader)({
    name: 'x-dev-user-email',
    description: 'DEV ONLY — email of the user to impersonate. Defaults to alice@acmecorp.com. Remove when real JWT auth is implemented.',
    required: false,
    example: 'alice@acmecorp.com',
});
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    me(user) {
        return this.authService.getMe(user);
    }
    myWorkspaces(user) {
        return this.authService.getUserWorkspaces(user);
    }
    switchWorkspace(user, dto) {
        return this.authService.switchWorkspace(user, dto.workspaceId);
    }
    async login(dto) {
        const user = await this.authService.validateUser(dto.email, dto.password);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid email or password');
        return this.authService.login(user.id);
    }
    logout() {
        return { message: 'Logged out successfully' };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    DEV_HEADER,
    (0, swagger_1.ApiOperation)({ summary: 'Get current user with workspace memberships' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auth_dto_1.MeResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Dev user not found in database' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", auth_dto_1.MeResponseDto)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('workspaces'),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    DEV_HEADER,
    (0, swagger_1.ApiOperation)({ summary: 'Get current user workspace memberships' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [auth_dto_1.WorkspaceMembershipDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Array)
], AuthController.prototype, "myWorkspaces", null);
__decorate([
    (0, common_1.Post)('switch-workspace'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(dev_auth_guard_1.DevAuthGuard),
    DEV_HEADER,
    (0, swagger_1.ApiOperation)({ summary: 'Switch active workspace' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: auth_dto_1.SwitchWorkspaceResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'User does not belong to workspace' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, auth_dto_1.SwitchWorkspaceDto]),
    __metadata("design:returntype", auth_dto_1.SwitchWorkspaceResponseDto)
], AuthController.prototype, "switchWorkspace", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Log in with email and password' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns JWT access token' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Log out (client clears token)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map