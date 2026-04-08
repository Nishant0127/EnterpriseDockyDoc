import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';

/**
 * Users endpoints.
 * Routes: /api/v1/users/*
 */
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users
   * Returns all active users with workspace memberships.
   */
  @Get()
  @ApiOperation({ summary: 'List all active users with workspace memberships' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  /**
   * GET /api/v1/users/:id
   * Returns a single user with all workspace memberships.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID with workspace memberships' })
  @ApiParam({ name: 'id', description: 'User cuid' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }
}
