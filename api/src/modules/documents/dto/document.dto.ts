import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { DocumentStatus } from '@prisma/client';

// ------------------------------------------------------------------ //
// Request DTOs
// ------------------------------------------------------------------ //

export class DocumentQueryDto {
  @ApiProperty({ description: 'Workspace ID (required)' })
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @ApiPropertyOptional({ description: 'Filter by folder ID' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ enum: DocumentStatus, description: 'Filter by status (default excludes DELETED)' })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Filter by owner user ID' })
  @IsOptional()
  @IsString()
  ownerUserId?: string;
}

export class CreateDocumentDto {
  @ApiProperty() @IsString() @IsNotEmpty() workspaceId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() fileName!: string;
  @ApiProperty({ description: 'File extension (pdf, docx, xlsx…)' })
  @IsString() @IsNotEmpty() fileType!: string;
  @ApiProperty({ description: 'MIME type for the initial version' })
  @IsString() @IsNotEmpty() mimeType!: string;
  @ApiProperty({ description: 'Owner user ID' }) @IsString() @IsNotEmpty() ownerUserId!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ description: 'Place document in this folder' })
  @IsOptional() @IsString() folderId?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  // Allow null to remove from folder
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o) => o.folderId !== null)
  @IsString()
  folderId?: string | null;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}

// ------------------------------------------------------------------ //
// Response DTOs
// ------------------------------------------------------------------ //

export class DocOwnerDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() email!: string;
}

export class DocFolderRefDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class DocTagRefDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() color!: string | null;
}

export class DocumentVersionDto {
  @ApiProperty() id!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty() storageKey!: string;
  @ApiProperty({ description: 'File size in bytes (serialized as string for BigInt safety)' })
  fileSizeBytes!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty({ type: DocOwnerDto }) uploadedBy!: DocOwnerDto;
  @ApiProperty() createdAt!: Date;
}

export class DocumentMetadataDto {
  @ApiProperty() id!: string;
  @ApiProperty() key!: string;
  @ApiProperty() value!: string;
}

export class DocumentListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() fileType!: string;
  @ApiProperty({ enum: DocumentStatus }) status!: DocumentStatus;
  @ApiProperty() currentVersionNumber!: number;
  @ApiPropertyOptional({ type: DocFolderRefDto }) folder!: DocFolderRefDto | null;
  @ApiProperty({ type: DocOwnerDto }) owner!: DocOwnerDto;
  @ApiProperty({ type: [DocTagRefDto] }) tags!: DocTagRefDto[];
  @ApiProperty() versionCount!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class DocumentDetailDto extends DocumentListItemDto {
  @ApiPropertyOptional() description!: string | null;
  @ApiProperty() workspace!: { id: string; name: string };
  @ApiProperty({ type: [DocumentVersionDto] }) versions!: DocumentVersionDto[];
  @ApiProperty({ type: [DocumentMetadataDto] }) metadata!: DocumentMetadataDto[];
}
