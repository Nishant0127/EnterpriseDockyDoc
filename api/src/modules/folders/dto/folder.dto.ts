import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// ------------------------------------------------------------------ //
// Request DTOs
// ------------------------------------------------------------------ //

export class FolderQueryDto {
  @ApiProperty({ description: 'Workspace ID to list folders for' })
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;
}

export class CreateFolderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Parent folder ID for nested folders' })
  @IsOptional()
  @IsString()
  parentFolderId?: string;
}

export class UpdateFolderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;
}

// ------------------------------------------------------------------ //
// Response DTOs
// ------------------------------------------------------------------ //

export class FolderCreatedByDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class FolderChildDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class FolderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() parentFolderId!: string | null;
  @ApiProperty({ type: FolderCreatedByDto }) createdBy!: FolderCreatedByDto;
  @ApiProperty() documentCount!: number;
  @ApiProperty() childCount!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class FolderDetailResponseDto extends FolderResponseDto {
  @ApiProperty({ type: [FolderChildDto] }) children!: FolderChildDto[];
}
