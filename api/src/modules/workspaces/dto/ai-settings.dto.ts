import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum AiProviderEnum {
  PLATFORM = 'PLATFORM',
  BYOK = 'BYOK',
}

export enum AiProviderTypeEnum {
  ANTHROPIC = 'ANTHROPIC',
  OPENAI = 'OPENAI',
}

export class UpdateAiSettingsDto {
  @IsOptional()
  @IsEnum(AiProviderEnum)
  aiProvider?: AiProviderEnum;

  @IsOptional()
  @IsEnum(AiProviderTypeEnum)
  aiProviderType?: AiProviderTypeEnum;

  @IsOptional()
  @IsString()
  @MinLength(10)
  apiKey?: string;
}

export const PLAN_TOKEN_LIMITS: Record<string, number> = {
  FREE: 50_000,
  PRO: 500_000,
  ENTERPRISE: 10_000_000,
};

export interface AiSettingsResponseDto {
  plan: string;
  aiProvider: string;
  aiProviderType: string;
  hasApiKey: boolean;
  aiUsageTokens: number;
  aiUsageLimit: number;
  aiUsagePercent: number;
}
