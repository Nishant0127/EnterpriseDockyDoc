import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { User, WorkspaceUser, Workspace } from '@prisma/client';
export type DevUserPayload = User & {
    workspaces: (WorkspaceUser & {
        workspace: Workspace;
    })[];
};
export declare class ClerkAuthGuard implements CanActivate {
    private readonly prisma;
    constructor(prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private verifyClerkToken;
    private linkClerkUser;
    private verifyDevHeader;
}
