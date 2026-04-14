import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import { MeResponseDto, WorkspaceMembershipDto, SwitchWorkspaceResponseDto } from './dto/auth.dto';
export declare class AuthService {
    private readonly config;
    private readonly jwt;
    private readonly prisma;
    constructor(config: ConfigService, jwt: JwtService, prisma: PrismaService);
    validateUser(email: string, password: string): Promise<{
        id: string;
        email: string;
    } | null>;
    login(userId: string): Promise<{
        accessToken: string;
    }>;
    setPassword(userId: string, password: string): Promise<void>;
    getMe(devUser: DevUserPayload): MeResponseDto;
    getUserWorkspaces(devUser: DevUserPayload): WorkspaceMembershipDto[];
    switchWorkspace(devUser: DevUserPayload, workspaceId: string): SwitchWorkspaceResponseDto;
    private buildMemberships;
}
