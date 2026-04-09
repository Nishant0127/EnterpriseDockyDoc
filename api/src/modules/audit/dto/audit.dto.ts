import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AuditAction, AuditEntityType } from '@prisma/client';

export { AuditAction, AuditEntityType };

export class AuditQueryDto {
  @ApiProperty({ description: 'Workspace to scope the activity feed' })
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @ApiPropertyOptional({ enum: AuditEntityType })
  @IsOptional()
  @IsEnum(AuditEntityType)
  entityType?: AuditEntityType;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

export class AuditUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() email!: string;
}

export class AuditLogDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiPropertyOptional({ nullable: true }) userId!: string | null;
  @ApiProperty({ enum: AuditAction }) action!: AuditAction;
  @ApiProperty({ enum: AuditEntityType }) entityType!: AuditEntityType;
  @ApiProperty() entityId!: string;
  @ApiPropertyOptional({ nullable: true }) metadata!: Record<string, unknown> | null;
  @ApiProperty() createdAt!: string;
  @ApiPropertyOptional({ nullable: true, type: AuditUserDto }) user!: AuditUserDto | null;
}
