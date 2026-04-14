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
exports.ClerkAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ClerkAuthGuard = class ClerkAuthGuard {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const secretKey = process.env.CLERK_SECRET_KEY;
        if (secretKey) {
            return this.verifyClerkToken(request, secretKey);
        }
        return this.verifyDevHeader(request);
    }
    async verifyClerkToken(request, secretKey) {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing Bearer token');
        }
        const token = authHeader.slice(7);
        let clerkUserId;
        try {
            const { verifyToken } = require('@clerk/backend');
            const payload = await verifyToken(token, { secretKey });
            clerkUserId = payload.sub;
        }
        catch (err) {
            throw new common_1.UnauthorizedException(err instanceof Error ? err.message : 'Invalid or expired Clerk token');
        }
        let user = await this.prisma.user.findUnique({
            where: { clerkId: clerkUserId },
            include: {
                workspaces: {
                    where: { status: 'ACTIVE' },
                    include: { workspace: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!user) {
            user = await this.linkClerkUser(clerkUserId, secretKey);
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is deactivated');
        }
        request.devUser = user;
        return true;
    }
    async linkClerkUser(clerkUserId, secretKey) {
        const { createClerkClient } = require('@clerk/backend');
        const clerk = createClerkClient({ secretKey });
        const clerkUser = await clerk.users.getUser(clerkUserId);
        const email = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
        if (!email) {
            throw new common_1.UnauthorizedException('Clerk user has no email address');
        }
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (!existing) {
            const firstName = clerkUser.firstName?.trim() || email.split('@')[0];
            const lastName = clerkUser.lastName?.trim() || '';
            return this.prisma.user.create({
                data: { email, clerkId: clerkUserId, firstName, lastName, isActive: true },
                include: {
                    workspaces: {
                        where: { status: 'ACTIVE' },
                        include: { workspace: true },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            });
        }
        return this.prisma.user.update({
            where: { id: existing.id },
            data: { clerkId: clerkUserId },
            include: {
                workspaces: {
                    where: { status: 'ACTIVE' },
                    include: { workspace: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
    }
    async verifyDevHeader(request) {
        const email = request.headers['x-dev-user-email']?.trim() ??
            'alice@acmecorp.com';
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                workspaces: {
                    where: { status: 'ACTIVE' },
                    include: { workspace: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException(`Dev user "${email}" not found. Check that the database is seeded and the email matches a user record.`);
        }
        request.devUser = user;
        return true;
    }
};
exports.ClerkAuthGuard = ClerkAuthGuard;
exports.ClerkAuthGuard = ClerkAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClerkAuthGuard);
//# sourceMappingURL=clerk-auth.guard.js.map