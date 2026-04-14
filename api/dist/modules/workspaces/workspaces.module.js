"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspacesModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const workspaces_controller_1 = require("./workspaces.controller");
const workspaces_service_1 = require("./workspaces.service");
const dev_auth_guard_1 = require("../../common/guards/dev-auth.guard");
const prisma_module_1 = require("../../prisma/prisma.module");
const audit_module_1 = require("../audit/audit.module");
const encryption_service_1 = require("../../common/services/encryption.service");
let WorkspacesModule = class WorkspacesModule {
};
exports.WorkspacesModule = WorkspacesModule;
exports.WorkspacesModule = WorkspacesModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, prisma_module_1.PrismaModule, audit_module_1.AuditModule],
        controllers: [workspaces_controller_1.WorkspacesController],
        providers: [workspaces_service_1.WorkspacesService, dev_auth_guard_1.DevAuthGuard, encryption_service_1.EncryptionService],
        exports: [workspaces_service_1.WorkspacesService, encryption_service_1.EncryptionService],
    })
], WorkspacesModule);
//# sourceMappingURL=workspaces.module.js.map