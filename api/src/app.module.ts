import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { StorageModule } from './modules/storage/storage.module';
import { SearchModule } from './modules/search/search.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { FoldersModule } from './modules/folders/folders.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TagsModule } from './modules/tags/tags.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { SharesModule } from './modules/shares/shares.module';
import { AuditModule } from './modules/audit/audit.module';
import { AiModule } from './modules/ai/ai.module';
import { ReportsModule } from './modules/reports/reports.module';
import { InvitationsModule } from './modules/invitations/invitations.module';

/**
 * Root application module.
 * Register new feature modules here as the product grows.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    PrismaModule,
    HealthModule,
    StorageModule,
    SearchModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    FoldersModule,
    DocumentsModule,
    TagsModule,
    RemindersModule,
    SharesModule,
    AuditModule,
    AiModule,
    ReportsModule,
    InvitationsModule,
  ],
})
export class AppModule {}
