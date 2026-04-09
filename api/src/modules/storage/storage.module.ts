import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';

export const STORAGE_SERVICE = 'STORAGE_SERVICE';

/**
 * StorageModule — provides the active storage backend.
 * Set STORAGE_PROVIDER=s3 in .env to switch from local to S3/MinIO.
 */
@Global()
@Module({
  providers: [
    LocalStorageService,
    S3StorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (config: ConfigService, local: LocalStorageService, s3: S3StorageService) => {
        const provider = config.get<string>('STORAGE_PROVIDER', 'local');
        return provider === 's3' ? s3 : local;
      },
      inject: [ConfigService, LocalStorageService, S3StorageService],
    },
  ],
  exports: [LocalStorageService, S3StorageService, STORAGE_SERVICE],
})
export class StorageModule {}
