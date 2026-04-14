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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const users = await this.prisma.user.findMany({
            where: { isActive: true },
            include: {
                workspaces: {
                    where: { status: 'ACTIVE' },
                    include: { workspace: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        return users.map((u) => ({
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            isActive: u.isActive,
            workspaces: u.workspaces.map((m) => ({
                workspaceId: m.workspaceId,
                workspaceName: m.workspace.name,
                workspaceSlug: m.workspace.slug,
                role: m.role,
                status: m.status,
            })),
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
        }));
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                workspaces: {
                    include: { workspace: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with id "${id}" not found`);
        }
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            workspaces: user.workspaces.map((m) => ({
                workspaceId: m.workspaceId,
                workspaceName: m.workspace.name,
                workspaceSlug: m.workspace.slug,
                role: m.role,
                status: m.status,
            })),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map