import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * AuthService — business logic for authentication.
 *
 * Currently stubbed. Implementation checklist:
 *   [ ] Hash passwords with bcrypt
 *   [ ] Validate credentials against User table via PrismaService
 *   [ ] Sign JWT access token
 *   [ ] Issue refresh token (store hash in DB)
 *   [ ] Revoke refresh token on logout
 */
@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Validate email/password credentials.
   * Replace stub with real DB lookup + bcrypt.compare.
   */
  async validateUser(email: string, password: string): Promise<{ id: string; email: string } | null> {
    // TODO: lookup user in DB
    // const user = await this.prisma.user.findUnique({ where: { email } });
    // if (!user || !await bcrypt.compare(password, user.passwordHash)) return null;
    // return user;
    void email;
    void password;
    throw new UnauthorizedException('Auth not implemented yet');
  }

  /**
   * Issue a JWT access token for an authenticated user.
   */
  async login(_userId: string): Promise<{ accessToken: string }> {
    // TODO: sign JWT with this.config.get('jwt.secret')
    throw new UnauthorizedException('Auth not implemented yet');
  }
}
