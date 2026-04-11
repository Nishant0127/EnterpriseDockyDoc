import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { WorkspaceUserRole } from '@prisma/client';

// ------------------------------------------------------------------ //
// Request DTOs
// ------------------------------------------------------------------ //

export class CreateInvitationDto {
  @ApiProperty({ description: 'Email address of the person to invite' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    enum: WorkspaceUserRole,
    default: WorkspaceUserRole.VIEWER,
    description: 'Role to grant on acceptance',
  })
  @IsEnum(WorkspaceUserRole)
  @IsOptional()
  role?: WorkspaceUserRole;
}

// ------------------------------------------------------------------ //
// Response DTOs
// ------------------------------------------------------------------ //

export class InvitationCreatedByDto {
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class InvitationWorkspaceDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() type!: string;
}

export class InvitationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: WorkspaceUserRole }) role!: WorkspaceUserRole;
  @ApiProperty() token!: string;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty() status!: string;
  @ApiProperty({ type: InvitationCreatedByDto }) createdBy!: InvitationCreatedByDto;
  @ApiProperty() createdAt!: Date;
}

/** Public-facing details returned by GET /api/v1/join/:token */
export class PublicInvitationDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: WorkspaceUserRole }) role!: WorkspaceUserRole;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty({ type: InvitationWorkspaceDto }) workspace!: InvitationWorkspaceDto;
  @ApiProperty({ type: InvitationCreatedByDto }) invitedBy!: InvitationCreatedByDto;
}

/** Returned after successful acceptance */
export class AcceptInvitationResponseDto {
  @ApiProperty() workspaceId!: string;
  @ApiProperty() workspaceName!: string;
  @ApiProperty({ enum: WorkspaceUserRole }) role!: WorkspaceUserRole;
}
