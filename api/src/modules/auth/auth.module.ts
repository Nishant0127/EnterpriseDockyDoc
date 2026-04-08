import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';

/**
 * AuthModule — authentication and current-user context.
 *
 * Current state:
 *   - DevAuthGuard resolves user from x-dev-user-email header (dev-only)
 *   - /me, /workspaces, /switch-workspace endpoints are live
 *   - /login and /logout are stubs
 *
 * Future additions:
 *   - JwtModule + PassportModule for real JWT auth
 *   - JwtAuthGuard to replace DevAuthGuard
 *   - Keycloak/OIDC strategy
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, DevAuthGuard],
  exports: [AuthService, DevAuthGuard],
})
export class AuthModule {}
