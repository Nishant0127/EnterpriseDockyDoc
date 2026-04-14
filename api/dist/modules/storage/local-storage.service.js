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
var LocalStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
let LocalStorageService = LocalStorageService_1 = class LocalStorageService {
    constructor() {
        this.logger = new common_1.Logger(LocalStorageService_1.name);
        this.uploadDir = path.join(process.cwd(), 'uploads');
        fs.mkdirSync(this.uploadDir, { recursive: true });
        this.logger.log(`Storage root → ${this.uploadDir}`);
    }
    async save(key, buffer) {
        const filePath = this.getAbsolutePath(key);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, buffer);
        this.logger.debug(`Saved ${buffer.length} B → ${filePath}`);
    }
    getAbsolutePath(key) {
        const segments = key
            .split('/')
            .filter((s) => s.length > 0 && s !== '..' && s !== '.');
        return path.join(this.uploadDir, ...segments);
    }
    async delete(key) {
        const filePath = this.getAbsolutePath(key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            this.logger.debug(`Deleted: ${filePath}`);
        }
    }
    exists(key) {
        return fs.existsSync(this.getAbsolutePath(key));
    }
};
exports.LocalStorageService = LocalStorageService;
exports.LocalStorageService = LocalStorageService = LocalStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], LocalStorageService);
//# sourceMappingURL=local-storage.service.js.map