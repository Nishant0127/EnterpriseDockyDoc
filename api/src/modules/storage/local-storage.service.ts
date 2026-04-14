import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { Readable } from 'stream';
import type { IStorageService } from './storage.interface';

/**
 * LocalStorageService — stores files on the local filesystem.
 *
 * Files are kept under UPLOAD_DIR (env) or <api-cwd>/uploads/{storageKey}.
 * Set UPLOAD_DIR=/var/data/uploads to use a Render Persistent Disk mount.
 *
 * Security note: getAbsolutePath() strips '..' segments to prevent path traversal.
 */
@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;

  constructor() {
    // UPLOAD_DIR env var lets you point to a Render Persistent Disk mount point
    // (e.g. /var/data/uploads).  Falls back to <api-cwd>/uploads for local dev.
    this.uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
    fs.mkdirSync(this.uploadDir, { recursive: true });
    this.logger.log(`Storage root → ${this.uploadDir}`);
  }

  async save(key: string, buffer: Buffer): Promise<void> {
    const filePath = this.getAbsolutePath(key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    this.logger.debug(`Saved ${buffer.length} B → ${filePath}`);
  }

  async getStream(key: string): Promise<Readable> {
    return fs.createReadStream(this.getAbsolutePath(key));
  }

  async getBuffer(key: string): Promise<Buffer> {
    return fs.promises.readFile(this.getAbsolutePath(key));
  }

  getAbsolutePath(key: string): string {
    // Strip empty segments and directory traversal attempts
    const segments = key
      .split('/')
      .filter((s) => s.length > 0 && s !== '..' && s !== '.');
    return path.join(this.uploadDir, ...segments);
  }

  async existsAsync(key: string): Promise<boolean> {
    return fs.existsSync(this.getAbsolutePath(key));
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getAbsolutePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.debug(`Deleted: ${filePath}`);
    }
  }
}
