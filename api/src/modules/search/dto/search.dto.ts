import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DocumentStatus } from '@prisma/client';

// ------------------------------------------------------------------ //
// Request
// ------------------------------------------------------------------ //

export class SearchQueryDto {
  @ApiProperty({ description: 'Workspace to search within' })
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @ApiProperty({
    description: 'Search query (name, description, tags, metadata, file content)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  q!: string;

  @ApiPropertyOptional({
    enum: DocumentStatus,
    description: 'Filter by status (default excludes DELETED)',
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Limit results to a specific folder' })
  @IsOptional()
  @IsString()
  folderId?: string;
}

// ------------------------------------------------------------------ //
// Response
// ------------------------------------------------------------------ //

export class SearchOwnerDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() email!: string;
}

export class SearchFolderDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class SearchTagDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() color!: string | null;
}

export class SearchResultDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description!: string | null;
  @ApiProperty() fileName!: string;
  @ApiProperty() fileType!: string;
  @ApiProperty({ enum: DocumentStatus }) status!: DocumentStatus;
  @ApiProperty() currentVersionNumber!: number;
  @ApiPropertyOptional({ type: SearchFolderDto }) folder!: SearchFolderDto | null;
  @ApiProperty({ type: SearchOwnerDto }) owner!: SearchOwnerDto;
  @ApiProperty({ type: [SearchTagDto] }) tags!: SearchTagDto[];
  @ApiProperty() versionCount!: number;
  @ApiPropertyOptional({
    description: 'Short excerpt from extracted text showing where the match occurred',
  })
  snippet?: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
