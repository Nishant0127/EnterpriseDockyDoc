import { Global, Logger, Module } from '@nestjs/common';
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
        const logger = new Logger('StorageModule');
        const provider = config.get<string>('STORAGE_PROVIDER', 'local');
        if (provider === 's3') {
          const bucket = config.get<string>('S3_BUCKET', 'dockydoc');
          const region = config.get<string>('S3_REGION', 'us-east-1');
          const hasKey = !!config.get<string>('S3_ACCESS_KEY_ID');
          logger.log(`Storage provider: S3 (bucket=${bucket}, region=${region}, credentialsSet=${hasKey})`);
          if (!hasKey) {
            logger.warn('S3_ACCESS_KEY_ID is not set — S3 uploads will fail. Set STORAGE_PROVIDER=local to use local storage.');
          }
          return s3;
        }
        logger.log(`Storage provider: local (UPLOAD_DIR=${process.env.UPLOAD_DIR ?? '<cwd>/uploads'})`);
        return local;
      },
      inject: [ConfigService, LocalStorageService, S3StorageService],
    },
  ],
  exports: [LocalStorageService, S3StorageService, STORAGE_SERVICE],
})
export class StorageModule {}
