/**
 * IStorageService — abstraction over the physical file store.
 *
 * Current implementation: LocalStorageService (api/uploads/)
 * Future swap: S3StorageService — change the provider in StorageModule only.
 *
 * Storage key format: workspaceId/documentId/v{n}/sanitizedFileName
 */
export interface IStorageService {
  /**
   * Persist a file buffer under the given storage key.
   * Parent directories are created automatically.
   */
  save(key: string, buffer: Buffer): Promise<void>;

  /**
   * Return the absolute filesystem path for a storage key.
   * Used by Express res.sendFile() to stream downloads.
   */
  getAbsolutePath(key: string): string;

  /**
   * Remove the stored file. Silently no-ops if not found.
   */
  delete(key: string): Promise<void>;

  /** True if the file exists on the backing store. */
  exists(key: string): boolean;
}
