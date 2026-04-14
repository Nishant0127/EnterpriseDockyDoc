import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/invitation.dto';
import type { InvitationResponseDto, PublicInvitationDto, AcceptInvitationResponseDto } from './dto/invitation.dto';
export declare class InvitationsController {
    private readonly invitationsService;
    constructor(invitationsService: InvitationsService);
    createInvitation(workspaceId: string, dto: CreateInvitationDto, user: DevUserPayload): Promise<InvitationResponseDto>;
    listInvitations(workspaceId: string, user: DevUserPayload): Promise<InvitationResponseDto[]>;
    revokeInvitation(workspaceId: string, inviteId: string, user: DevUserPayload): Promise<void>;
    getInvitation(token: string): Promise<PublicInvitationDto>;
    acceptInvitation(token: string, user: DevUserPayload): Promise<AcceptInvitationResponseDto>;
}
