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
var S3StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const fs_1 = require("fs");
const path_1 = require("path");
const fs = require("fs");
let S3StorageService = S3StorageService_1 = class S3StorageService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(S3StorageService_1.name);
        const endpoint = this.config.get('S3_ENDPOINT');
        this.bucket = this.config.get('S3_BUCKET', 'dockydoc');
        this.cacheDir = (0, path_1.join)(process.cwd(), '.s3cache');
        if (!(0, fs_1.existsSync)(this.cacheDir)) {
            (0, fs_1.mkdirSync)(this.cacheDir, { recursive: true });
        }
        this.s3 = new client_s3_1.S3Client({
            region: this.config.get('S3_REGION', 'us-east-1'),
            credentials: {
                accessKeyId: this.config.get('S3_ACCESS_KEY_ID', 'minioadmin'),
                secretAccessKey: this.config.get('S3_SECRET_ACCESS_KEY', 'minioadmin'),
            },
            ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
        });
    }
    async save(key, buffer) {
        await this.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
        }));
        this.logger.debug(`Uploaded ${key} to S3 bucket ${this.bucket}`);
    }
    getAbsolutePath(key) {
        return (0, path_1.join)(this.cacheDir, key.replace(/\//g, '_'));
    }
    async downloadToCache(key) {
        const localPath = this.getAbsolutePath(key);
        const dir = require('path').dirname(localPath);
        if (!(0, fs_1.existsSync)(dir))
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        const res = await this.s3.send(new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: key }));
        await new Promise((resolve, reject) => {
            const stream = res.Body;
            const write = (0, fs_1.createWriteStream)(localPath);
            stream.pipe(write);
            write.on('finish', resolve);
            write.on('error', reject);
        });
        return localPath;
    }
    async delete(key) {
        try {
            await this.s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
        }
        catch (err) {
            this.logger.warn(`Failed to delete ${key} from S3: ${err}`);
        }
        const cached = this.getAbsolutePath(key);
        if ((0, fs_1.existsSync)(cached))
            fs.unlinkSync(cached);
    }
    exists(key) {
        return (0, fs_1.existsSync)(this.getAbsolutePath(key));
    }
    async existsAsync(key) {
        try {
            await this.s3.send(new client_s3_1.HeadObjectCommand({ Bucket: this.bucket, Key: key }));
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.S3StorageService = S3StorageService;
exports.S3StorageService = S3StorageService = S3StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], S3StorageService);
//# sourceMappingURL=s3-storage.service.js.map