import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/invitation.dto';
import type {
  InvitationResponseDto,
  PublicInvitationDto,
  AcceptInvitationResponseDto,
} from './dto/invitation.dto';

/**
 * Invitation management endpoints.
 *
 * Workspace-scoped (admin/owner):
 *   POST   /api/v1/workspaces/:id/invitations        — create invitation
 *   GET    /api/v1/workspaces/:id/invitations         — list pending invitations
 *   DELETE /api/v1/workspaces/:id/invitations/:invId  — revoke invitation
 *
 * Public join (no auth for GET, auth required for POST):
 *   GET  /api/v1/join/:token   — get invitation details
 *   POST /api/v1/join/:token   — accept invitation
 */
@ApiTags('Invitations')
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  // ------------------------------------------------------------------ //
  // Workspace-scoped admin routes
  // ------------------------------------------------------------------ //

  @Post('workspaces/:id/invitations')
  @UseGuards(DevAuthGuard)
  @ApiOperation({ summary: 'Create workspace invitation (ADMIN/OWNER only)' })
  @ApiParam({ name: 'id', description: 'Workspace cuid' })
  @ApiResponse({ status: 201, description: 'Invitation created' })
  @ApiResponse({ status: 409, description: 'Already an active member or pending invite exists' })
  createInvitation(
    @Param('id') workspaceId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<InvitationResponseDto> {
    return this.invitationsService.create(workspaceId, dto, user);
  }

  @Get('workspaces/:id/invitations')
  @UseGuards(DevAuthGuard)
  @ApiOperation({ summary: 'List pending invitations for a workspace (ADMIN/OWNER only)' })
  @ApiParam({ name: 'id', description: 'Workspace cuid' })
  @ApiResponse({ status: 200, description: 'List of pending invitations' })
  listInvitations(
    @Param('id') workspaceId: string,
    @CurrentUser() user: DevUserPayload,
  ): Promise<InvitationResponseDto[]> {
    return this.invitationsService.listPending(workspaceId, user);
  }

  @Delete('workspaces/:id/invitations/:inviteId')
  @UseGuards(DevAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke a pending invitation (ADMIN/OWNER only)' })
  @ApiParam({ name: 'id', description: 'Workspace cuid' })
  @ApiParam({ name: 'inviteId', description: 'Invitation cuid' })
  @ApiResponse({ status: 204, description: 'Invitation revoked' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async revokeInvitation(
    @Param('id') workspaceId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: DevUserPayload,
  ): Promise<void> {
    await this.invitationsService.revoke(workspaceId, inviteId, user);
  }

  // ------------------------------------------------------------------ //
  // Public join routes
  // ------------------------------------------------------------------ //

  /**
   * GET /api/v1/join/:token
   * Public — no auth required. Returns invitation details so the join page can
   * show workspace name, invited-by, role, and expiry without forcing login first.
   */
  @Get('join/:token')
  @ApiOperation({ summary: 'Get invitation details by token (public)' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({ status: 200, description: 'Invitation details' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  @ApiResponse({ status: 410, description: 'Invitation expired, revoked, or already accepted' })
  getInvitation(@Param('token') token: string): Promise<PublicInvitationDto> {
    return this.invitationsService.getByToken(token);
  }

  /**
   * POST /api/v1/join/:token
   * Auth required. Accepts the invitation and creates the workspace membership.
   * The authenticated user's email must match the invitation email.
   */
  @Post('join/:token')
  @UseGuards(DevAuthGuard)
  @ApiOperation({ summary: 'Accept workspace invitation (auth required)' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({ status: 201, description: 'Invitation accepted, membership created' })
  @ApiResponse({ status: 403, description: 'Email mismatch' })
  @ApiResponse({ status: 410, description: 'Invitation expired, revoked, or already accepted' })
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: DevUserPayload,
  ): Promise<AcceptInvitationResponseDto> {
    return this.invitationsService.accept(token, user);
  }
}
