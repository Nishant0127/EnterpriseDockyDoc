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
exports.PublicSharesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const shares_service_1 = require("./shares.service");
const share_dto_1 = require("./dto/share.dto");
let PublicSharesController = class PublicSharesController {
    constructor(sharesService) {
        this.sharesService = sharesService;
    }
    getShareInfo(token, req) {
        return this.sharesService.getPublicShareInfo(token, req.ip, req.headers['user-agent']);
    }
    verifyPassword(token, dto, req) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            ?? req.ip
            ?? 'unknown';
        return this.sharesService.verifySharePassword(token, dto.password, ip);
    }
    async download(token, grant, req, res) {
        const { absolutePath, fileName, mimeType } = await this.sharesService.getPublicShareDownloadInfo(token, grant, req.ip, req.headers['user-agent']);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.sendFile(absolutePath, (err) => {
            if (err && !res.headersSent) {
                res.status(500).json({ message: 'Failed to stream file' });
            }
        });
    }
};
exports.PublicSharesController = PublicSharesController;
__decorate([
    (0, common_1.Get)(':token'),
    (0, swagger_1.ApiOperation)({ summary: 'Get public share info by token' }),
    (0, swagger_1.ApiParam)({ name: 'token', description: '64-char hex share token' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: share_dto_1.PublicShareInfoDto }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Share revoked or expired' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Share not found' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PublicSharesController.prototype, "getShareInfo", null);
__decorate([
    (0, common_1.Post)(':token/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify share password and obtain access grant' }),
    (0, swagger_1.ApiParam)({ name: 'token' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: share_dto_1.VerifyShareResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Share is not password protected' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Incorrect password' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Share not found' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, share_dto_1.VerifySharePasswordDto, Object]),
    __metadata("design:returntype", Promise)
], PublicSharesController.prototype, "verifyPassword", null);
__decorate([
    (0, common_1.Get)(':token/download'),
    (0, swagger_1.ApiOperation)({ summary: 'Download document via public share link' }),
    (0, swagger_1.ApiParam)({ name: 'token' }),
    (0, swagger_1.ApiQuery)({ name: 'grant', required: false, description: 'Access grant from /verify (password-protected shares)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'File stream' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Password verification required' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Download not allowed or share revoked/expired' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Share or file not found' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)('grant')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PublicSharesController.prototype, "download", null);
exports.PublicSharesController = PublicSharesController = __decorate([
    (0, swagger_1.ApiTags)('Public Shares'),
    (0, common_1.Controller)('public/shares'),
    __metadata("design:paramtypes", [shares_service_1.SharesService])
], PublicSharesController);
//# sourceMappingURL=public-shares.controller.js.map