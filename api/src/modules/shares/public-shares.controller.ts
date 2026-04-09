import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SharesService } from './shares.service';
import {
  PublicShareInfoDto,
  VerifySharePasswordDto,
  VerifyShareResponseDto,
} from './dto/share.dto';

/**
 * PublicSharesController — unauthenticated endpoints for external share access.
 *
 * No DevAuthGuard — these routes are intentionally public.
 * Access logging is done inside the service.
 *
 * Routes: /api/v1/public/shares/:token
 */
@ApiTags('Public Shares')
@Controller('public/shares')
export class PublicSharesController {
  constructor(private readonly sharesService: SharesService) {}

  /**
   * GET /api/v1/public/shares/:token
   * Get share info (document name, expiry, password requirement).
   */
  @Get(':token')
  @ApiOperation({ summary: 'Get public share info by token' })
  @ApiParam({ name: 'token', description: '64-char hex share token' })
  @ApiResponse({ status: 200, type: PublicShareInfoDto })
  @ApiResponse({ status: 403, description: 'Share revoked or expired' })
  @ApiResponse({ status: 404, description: 'Share not found' })
  getShareInfo(
    @Param('token') token: string,
    @Req() req: Request,
  ): Promise<PublicShareInfoDto> {
    return this.sharesService.getPublicShareInfo(
      token,
      req.ip,
      req.headers['user-agent'],
    );
  }

  /**
   * POST /api/v1/public/shares/:token/verify
   * Verify the share password. Returns a short-lived access grant on success.
   */
  @Post(':token/verify')
  @ApiOperation({ summary: 'Verify share password and obtain access grant' })
  @ApiParam({ name: 'token' })
  @ApiResponse({ status: 201, type: VerifyShareResponseDto })
  @ApiResponse({ status: 400, description: 'Share is not password protected' })
  @ApiResponse({ status: 401, description: 'Incorrect password' })
  @ApiResponse({ status: 404, description: 'Share not found' })
  verifyPassword(
    @Param('token') token: string,
    @Body() dto: VerifySharePasswordDto,
    @Req() req: Request,
  ): Promise<VerifyShareResponseDto> {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.ip
      ?? 'unknown';
    return this.sharesService.verifySharePassword(token, dto.password, ip);
  }

  /**
   * GET /api/v1/public/shares/:token/download
   * Download the shared document.
   *
   * For password-protected shares, pass ?grant=<accessGrant> obtained from /verify.
   */
  @Get(':token/download')
  @ApiOperation({ summary: 'Download document via public share link' })
  @ApiParam({ name: 'token' })
  @ApiQuery({ name: 'grant', required: false, description: 'Access grant from /verify (password-protected shares)' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 401, description: 'Password verification required' })
  @ApiResponse({ status: 403, description: 'Download not allowed or share revoked/expired' })
  @ApiResponse({ status: 404, description: 'Share or file not found' })
  async download(
    @Param('token') token: string,
    @Query('grant') grant: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { absolutePath, fileName, mimeType } =
      await this.sharesService.getPublicShareDownloadInfo(
        token,
        grant,
        req.ip,
        req.headers['user-agent'],
      );

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    res.sendFile(absolutePath, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ message: 'Failed to stream file' });
      }
    });
  }
}
