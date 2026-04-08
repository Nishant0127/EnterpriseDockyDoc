import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { IStorageService } from './storage.interface';

/**
 * LocalStorageService — stores files on the local filesystem.
 *
 * Files are kept under <api-cwd>/uploads/{storageKey}.
 *
 * How to swap for S3 later:
 *   1. Create S3StorageService implementing IStorageService.
 *   2. Replace LocalStorageService with S3StorageService in StorageModule providers/exports.
 *   3. No other code changes required.
 *
 * Security note: getAbsolutePath() strips '..' segments to prevent path traversal.
 */
@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;

  constructor() {
    // process.cwd() is the api/ directory when started via npm/nest CLI
    this.uploadDir = path.join(process.cwd(), 'uploads');
    fs.mkdirSync(this.uploadDir, { recursive: true });
    this.logger.log(`Storage root → ${this.uploadDir}`);
  }

  async save(key: string, buffer: Buffer): Promise<void> {
    const filePath = this.getAbsolutePath(key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    this.logger.debug(`Saved ${buffer.length} B → ${filePath}`);
  }

  getAbsolutePath(key: string): string {
    // Strip empty segments and directory traversal attempts
    const segments = key
      .split('/')
      .filter((s) => s.length > 0 && s !== '..' && s !== '.');
    return path.join(this.uploadDir, ...segments);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getAbsolutePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.debug(`Deleted: ${filePath}`);
    }
  }

  exists(key: string): boolean {
    return fs.existsSync(this.getAbsolutePath(key));
  }
}
