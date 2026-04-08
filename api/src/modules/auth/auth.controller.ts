import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

// ------------------------------------------------------------------ //
// DTOs (inline — move to dto/ subfolder as they grow)
// ------------------------------------------------------------------ //

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

// ------------------------------------------------------------------ //
// Controller
// ------------------------------------------------------------------ //

/**
 * Auth endpoints.
 * Routes: /api/v1/auth/*
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Returns a JWT access token on success.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      return { message: 'Invalid credentials' };
    }
    return this.authService.login(user.id);
  }

  /**
   * POST /api/v1/auth/logout
   * Invalidates the refresh token.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out (invalidate refresh token)' })
  logout() {
    // TODO: implement refresh token invalidation
    return { message: 'Logged out' };
  }
}
