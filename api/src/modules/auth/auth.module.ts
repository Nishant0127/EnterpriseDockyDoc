import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * AuthModule — handles login, token refresh, and logout.
 *
 * Future additions:
 * - JwtModule (from @nestjs/jwt) for signing/verifying tokens
 * - PassportModule for strategy-based auth
 * - Keycloak/OIDC strategy for SSO
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
