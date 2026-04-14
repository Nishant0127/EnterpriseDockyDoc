import { ConfigService } from '@nestjs/config';
import type { IStorageService } from './storage.interface';
export declare class S3StorageService implements IStorageService {
    private readonly config;
    private readonly logger;
    private readonly s3;
    private readonly bucket;
    private readonly cacheDir;
    constructor(config: ConfigService);
    save(key: string, buffer: Buffer): Promise<void>;
    getAbsolutePath(key: string): string;
    downloadToCache(key: string): Promise<string>;
    delete(key: string): Promise<void>;
    exists(key: string): boolean;
    existsAsync(key: string): Promise<boolean>;
}
