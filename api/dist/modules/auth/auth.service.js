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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../../prisma/prisma.service");
let AuthService = class AuthService {
    constructor(config, jwt, prisma) {
        this.config = config;
        this.jwt = jwt;
        this.prisma = prisma;
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive)
            return null;
        const hash = user.passwordHash;
        if (!hash) {
            if (process.env.NODE_ENV !== 'production')
                return { id: user.id, email: user.email };
            return null;
        }
        const valid = await bcrypt.compare(password, hash);
        return valid ? { id: user.id, email: user.email } : null;
    }
    async login(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const payload = { sub: user.id, email: user.email };
        return { accessToken: this.jwt.sign(payload) };
    }
    async setPassword(userId, password) {
        const hash = await bcrypt.hash(password, 12);
        await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    }
    getMe(devUser) {
        const workspaces = this.buildMemberships(devUser);
        const defaultWorkspace = workspaces.find((w) => w.role === 'OWNER') ?? workspaces[0] ?? null;
        return {
            id: devUser.id,
            email: devUser.email,
            firstName: devUser.firstName,
            lastName: devUser.lastName,
            isActive: devUser.isActive,
            workspaces,
            defaultWorkspace,
        };
    }
    getUserWorkspaces(devUser) {
        return this.buildMemberships(devUser);
    }
    switchWorkspace(devUser, workspaceId) {
        const membership = devUser.workspaces.find((m) => m.workspaceId === workspaceId);
        if (!membership) {
            throw new common_1.ForbiddenException(`User does not belong to workspace "${workspaceId}"`);
        }
        return {
            workspaceId: membership.workspaceId,
            workspaceName: membership.workspace.name,
            workspaceSlug: membership.workspace.slug,
            workspaceType: membership.workspace.type,
            role: membership.role,
        };
    }
    buildMemberships(devUser) {
        return devUser.workspaces.map((m) => ({
            workspaceId: m.workspaceId,
            workspaceName: m.workspace.name,
            workspaceSlug: m.workspace.slug,
            workspaceType: m.workspace.type,
            role: m.role,
            status: m.status,
        }));
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map