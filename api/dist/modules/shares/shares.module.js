"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharesModule = void 0;
const common_1 = require("@nestjs/common");
const shares_service_1 = require("./shares.service");
const shares_controller_1 = require("./shares.controller");
const public_shares_controller_1 = require("./public-shares.controller");
const dev_auth_guard_1 = require("../../common/guards/dev-auth.guard");
let SharesModule = class SharesModule {
};
exports.SharesModule = SharesModule;
exports.SharesModule = SharesModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            shares_controller_1.DocumentSharesController,
            shares_controller_1.ShareManagementController,
            public_shares_controller_1.PublicSharesController,
        ],
        providers: [shares_service_1.SharesService, dev_auth_guard_1.DevAuthGuard],
    })
], SharesModule);
//# sourceMappingURL=shares.module.js.map