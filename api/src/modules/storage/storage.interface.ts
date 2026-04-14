import type { Readable } from 'stream';

/**
 * IStorageService — abstraction over the physical file store.
 *
 * Current implementations: LocalStorageService (api/uploads/), S3StorageService.
 * Set STORAGE_PROVIDER=s3 to switch.
 *
 * Storage key format: workspaceId/documentId/v{n}/sanitizedFileName
 */
export interface IStorageService {
  /** Persist a file buffer under the given storage key. */
  save(key: string, buffer: Buffer): Promise<void>;

  /**
   * Return a readable stream for the stored file.
   * Use this for HTTP downloads — works for both local and S3.
   */
  getStream(key: string): Promise<Readable>;

  /**
   * Read the full file content into a Buffer.
   * Use this for in-process consumption (AI extraction, OCR).
   */
  getBuffer(key: string): Promise<Buffer>;

  /**
   * Return the absolute local filesystem path for a storage key.
   * Only reliable for LocalStorageService; for S3 use getStream/getBuffer instead.
   */
  getAbsolutePath(key: string): string;

  /** Check whether a file exists on the backing store. */
  existsAsync(key: string): Promise<boolean>;

  /** Remove the stored file. Silently no-ops if not found. */
  delete(key: string): Promise<void>;
}
