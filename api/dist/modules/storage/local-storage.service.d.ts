import type { IStorageService } from './storage.interface';
export declare class LocalStorageService implements IStorageService {
    private readonly logger;
    private readonly uploadDir;
    constructor();
    save(key: string, buffer: Buffer): Promise<void>;
    getAbsolutePath(key: string): string;
    delete(key: string): Promise<void>;
    exists(key: string): boolean;
}
