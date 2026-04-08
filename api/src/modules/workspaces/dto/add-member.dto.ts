import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { WorkspaceUserRole, WorkspaceUserStatus } from '@prisma/client';

export class AddWorkspaceMemberDto {
  @ApiProperty({ description: 'Email address — creates user if not found' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ enum: WorkspaceUserRole })
  @IsEnum(WorkspaceUserRole)
  role!: WorkspaceUserRole;
}

export class UpdateWorkspaceMemberDto {
  @ApiPropertyOptional({ enum: WorkspaceUserRole })
  @IsOptional()
  @IsEnum(WorkspaceUserRole)
  role?: WorkspaceUserRole;

  @ApiPropertyOptional({ enum: WorkspaceUserStatus })
  @IsOptional()
  @IsEnum(WorkspaceUserStatus)
  status?: WorkspaceUserStatus;
}
