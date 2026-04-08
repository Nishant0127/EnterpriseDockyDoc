import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ReminderChannel, ReminderStatus } from '@prisma/client';

export class ReminderQueryDto {
  @ApiProperty({ description: 'Workspace ID (required)' })
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;
}

export class ExpiringDocumentDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() workspaceId!: string;
  @ApiPropertyOptional({ nullable: true }) expiryDate!: Date | null;
  @ApiPropertyOptional({ nullable: true }) renewalDueDate!: Date | null;
  @ApiProperty() isReminderEnabled!: boolean;
  @ApiPropertyOptional({ nullable: true }) folderName!: string | null;
  @ApiProperty() ownerEmail!: string;
  @ApiProperty() daysUntilExpiry!: number;
}

export class UpcomingReminderDto {
  @ApiProperty() id!: string;
  @ApiProperty() documentId!: string;
  @ApiProperty() documentName!: string;
  @ApiProperty() remindAt!: Date;
  @ApiProperty({ enum: ReminderChannel }) channel!: ReminderChannel;
  @ApiProperty({ enum: ReminderStatus }) status!: ReminderStatus;
  @ApiPropertyOptional({ nullable: true }) expiryDate!: Date | null;
}
