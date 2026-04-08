import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * UsersModule — manages user accounts.
 *
 * Future: add JwtAuthGuard to protect routes,
 * add RolesGuard + @Roles() decorator for RBAC.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
