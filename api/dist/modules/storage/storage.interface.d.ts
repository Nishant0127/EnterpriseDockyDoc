export interface IStorageService {
    save(key: string, buffer: Buffer): Promise<void>;
    getAbsolutePath(key: string): string;
    delete(key: string): Promise<void>;
    exists(key: string): boolean;
}
