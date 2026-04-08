import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Fields sent as multipart/form-data when uploading a new document.
 * The actual file binary is injected separately via @UploadedFile().
 */
export class UploadDocumentDto {
  @ApiProperty({ description: 'Target workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @ApiProperty({ description: 'Human-readable document name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Optional document description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Folder ID to place the document in' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated tag IDs to attach (must exist in workspace)',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: 'Metadata as JSON array: [{"key":"dept","value":"Finance"},...]',
  })
  @IsOptional()
  @IsString()
  metadata?: string;
}

/**
 * Fields sent as multipart/form-data when uploading a new document version.
 * The actual file binary is injected separately via @UploadedFile().
 */
export class UploadVersionDto {
  @ApiPropertyOptional({ description: 'Optional change notes for this version' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Slim response returned after a successful upload or version upload.
 * The full DocumentDetailDto is returned — this alias exists for Swagger docs.
 */
export class UploadResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() currentVersionNumber!: number;
}
