import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';

/**
 * Root application module.
 * Register new feature modules here as the product grows.
 */
@Module({
  imports: [
    // Config — load env vars globally so all modules can inject ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    // Database
    PrismaModule,

    // Infrastructure
    HealthModule,

    // Feature modules
    AuthModule,
    UsersModule,
    WorkspacesModule,
  ],
})
export class AppModule {}
