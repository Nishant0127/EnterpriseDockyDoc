import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';

/**
 * StorageModule — global module that provides LocalStorageService.
 *
 * Marked @Global() so any feature module can inject LocalStorageService
 * without re-importing StorageModule everywhere.
 *
 * To swap to S3: replace LocalStorageService with S3StorageService in
 * providers and exports below — nothing else changes.
 */
@Global()
@Module({
  providers: [LocalStorageService],
  exports: [LocalStorageService],
})
export class StorageModule {}
