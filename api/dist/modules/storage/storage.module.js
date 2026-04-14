"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageModule = exports.STORAGE_SERVICE = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const local_storage_service_1 = require("./local-storage.service");
const s3_storage_service_1 = require("./s3-storage.service");
exports.STORAGE_SERVICE = 'STORAGE_SERVICE';
let StorageModule = class StorageModule {
};
exports.StorageModule = StorageModule;
exports.StorageModule = StorageModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            local_storage_service_1.LocalStorageService,
            s3_storage_service_1.S3StorageService,
            {
                provide: exports.STORAGE_SERVICE,
                useFactory: (config, local, s3) => {
                    const provider = config.get('STORAGE_PROVIDER', 'local');
                    return provider === 's3' ? s3 : local;
                },
                inject: [config_1.ConfigService, local_storage_service_1.LocalStorageService, s3_storage_service_1.S3StorageService],
            },
        ],
        exports: [local_storage_service_1.LocalStorageService, s3_storage_service_1.S3StorageService, exports.STORAGE_SERVICE],
    })
], StorageModule);
//# sourceMappingURL=storage.module.js.map