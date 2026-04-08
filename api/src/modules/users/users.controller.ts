import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

/**
 * Users endpoints.
 * Routes: /api/v1/users/*
 *
 * All routes will require authentication (JwtAuthGuard) once auth is implemented.
 */
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users
   * List users (admin/owner only — add RolesGuard here later).
   */
  @Get()
  @ApiOperation({ summary: 'List users in workspace' })
  findAll() {
    return this.usersService.findAll();
  }
}
