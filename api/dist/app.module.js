"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const configuration_1 = require("./config/configuration");
const prisma_module_1 = require("./prisma/prisma.module");
const health_module_1 = require("./health/health.module");
const storage_module_1 = require("./modules/storage/storage.module");
const search_module_1 = require("./modules/search/search.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const workspaces_module_1 = require("./modules/workspaces/workspaces.module");
const folders_module_1 = require("./modules/folders/folders.module");
const documents_module_1 = require("./modules/documents/documents.module");
const tags_module_1 = require("./modules/tags/tags.module");
const reminders_module_1 = require("./modules/reminders/reminders.module");
const shares_module_1 = require("./modules/shares/shares.module");
const audit_module_1 = require("./modules/audit/audit.module");
const ai_module_1 = require("./modules/ai/ai.module");
const reports_module_1 = require("./modules/reports/reports.module");
const invitations_module_1 = require("./modules/invitations/invitations.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
                envFilePath: '.env',
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'default',
                    ttl: 60_000,
                    limit: 100,
                },
            ]),
            prisma_module_1.PrismaModule,
            health_module_1.HealthModule,
            storage_module_1.StorageModule,
            search_module_1.SearchModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            workspaces_module_1.WorkspacesModule,
            folders_module_1.FoldersModule,
            documents_module_1.DocumentsModule,
            tags_module_1.TagsModule,
            reminders_module_1.RemindersModule,
            shares_module_1.SharesModule,
            audit_module_1.AuditModule,
            ai_module_1.AiModule,
            reports_module_1.ReportsModule,
            invitations_module_1.InvitationsModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map