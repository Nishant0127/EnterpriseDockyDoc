import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as fs from 'fs';
import type { IStorageService } from './storage.interface';
import { Readable } from 'stream';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cacheDir: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    this.bucket = this.config.get<string>('S3_BUCKET', 'dockydoc');
    this.cacheDir = join(process.cwd(), '.s3cache');

    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }

    this.s3 = new S3Client({
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID', 'minioadmin'),
        secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY', 'minioadmin'),
      },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }

  async save(key: string, buffer: Buffer): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
      }),
    );
    this.logger.debug(`Uploaded ${key} to S3 bucket ${this.bucket}`);
  }

  getAbsolutePath(key: string): string {
    // Return cache path — caller must ensure download first via downloadToCache
    return join(this.cacheDir, key.replace(/\//g, '_'));
  }

  async downloadToCache(key: string): Promise<string> {
    const localPath = this.getAbsolutePath(key);
    const dir = require('path').dirname(localPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    await new Promise<void>((resolve, reject) => {
      const stream = res.Body as Readable;
      const write = createWriteStream(localPath);
      stream.pipe(write);
      write.on('finish', resolve);
      write.on('error', reject);
    });

    return localPath;
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      this.logger.warn(`Failed to delete ${key} from S3: ${err}`);
    }
    // Remove from cache if present
    const cached = this.getAbsolutePath(key);
    if (existsSync(cached)) fs.unlinkSync(cached);
  }

  exists(key: string): boolean {
    // For S3 — synchronous check is on cache only; use existsAsync for real check
    return existsSync(this.getAbsolutePath(key));
  }

  async existsAsync(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
