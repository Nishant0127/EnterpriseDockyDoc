import { PrismaService } from '../../prisma/prisma.service';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import type { CreateInvitationDto } from './dto/invitation.dto';
import type { InvitationResponseDto, PublicInvitationDto, AcceptInvitationResponseDto } from './dto/invitation.dto';
export declare class InvitationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(workspaceId: string, dto: CreateInvitationDto, actor: DevUserPayload): Promise<InvitationResponseDto>;
    listPending(workspaceId: string, actor: DevUserPayload): Promise<InvitationResponseDto[]>;
    revoke(workspaceId: string, inviteId: string, actor: DevUserPayload): Promise<void>;
    getByToken(token: string): Promise<PublicInvitationDto>;
    accept(token: string, actor: DevUserPayload): Promise<AcceptInvitationResponseDto>;
    private toResponseDto;
}
