export declare enum AiProviderEnum {
    PLATFORM = "PLATFORM",
    BYOK = "BYOK"
}
export declare enum AiProviderTypeEnum {
    ANTHROPIC = "ANTHROPIC",
    OPENAI = "OPENAI"
}
export declare class UpdateAiSettingsDto {
    aiProvider?: AiProviderEnum;
    aiProviderType?: AiProviderTypeEnum;
    apiKey?: string;
}
export declare const PLAN_TOKEN_LIMITS: Record<string, number>;
export interface AiSettingsResponseDto {
    plan: string;
    aiProvider: string;
    aiProviderType: string;
    hasApiKey: boolean;
    aiUsageTokens: number;
    aiUsageLimit: number;
    aiUsagePercent: number;
}
