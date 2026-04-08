import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { DevUserPayload } from '../guards/dev-auth.guard';

/**
 * @CurrentUser() param decorator.
 *
 * Extracts the resolved user from request.devUser (set by DevAuthGuard).
 *
 * When real JWT auth is implemented:
 *   - DevAuthGuard is replaced by JwtAuthGuard which sets request.user
 *   - Update this decorator to read from request.user instead
 *   - All controllers using @CurrentUser() need no further changes
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(DevAuthGuard)
 *   getMe(@CurrentUser() user: DevUserPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DevUserPayload => {
    const request = ctx.switchToHttp().getRequest<{ devUser: DevUserPayload }>();
    return request.devUser;
  },
);
