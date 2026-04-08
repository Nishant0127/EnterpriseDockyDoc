import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceUserRole, WorkspaceUserStatus } from '@prisma/client';

export class UserWorkspaceDto {
  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  workspaceName!: string;

  @ApiProperty()
  workspaceSlug!: string;

  @ApiProperty({ enum: WorkspaceUserRole })
  role!: WorkspaceUserRole;

  @ApiProperty({ enum: WorkspaceUserStatus })
  status!: WorkspaceUserStatus;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [UserWorkspaceDto] })
  workspaces!: UserWorkspaceDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
