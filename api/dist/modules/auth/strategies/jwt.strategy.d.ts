import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    email: string;
    iat?: number;
    exp?: number;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        workspaces: ({
            workspace: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.WorkspaceStatus;
                slug: string;
                type: import(".prisma/client").$Enums.WorkspaceType;
                trashRetentionDays: number;
                plan: import(".prisma/client").$Enums.WorkspacePlan;
                aiProvider: import(".prisma/client").$Enums.AiProvider;
                aiProviderType: import(".prisma/client").$Enums.AiProviderType;
                aiApiKeyEncrypted: string | null;
                aiUsageTokens: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            workspaceId: string;
            role: import(".prisma/client").$Enums.WorkspaceUserRole;
            status: import(".prisma/client").$Enums.WorkspaceUserStatus;
        })[];
    } & {
        id: string;
        clerkId: string | null;
        email: string;
        firstName: string;
        lastName: string;
        passwordHash: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
