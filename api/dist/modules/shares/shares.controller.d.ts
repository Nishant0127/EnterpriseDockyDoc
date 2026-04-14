import { type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { SharesService } from './shares.service';
import { CreateExternalShareDto, CreateInternalShareDto, DocumentSharesResponseDto, ExternalShareDto, InternalShareDto } from './dto/share.dto';
export declare class DocumentSharesController {
    private readonly sharesService;
    constructor(sharesService: SharesService);
    createInternalShare(id: string, dto: CreateInternalShareDto, user: DevUserPayload): Promise<InternalShareDto[]>;
    createExternalShare(id: string, dto: CreateExternalShareDto, user: DevUserPayload): Promise<ExternalShareDto>;
    getShares(id: string, user: DevUserPayload): Promise<DocumentSharesResponseDto>;
}
export declare class ShareManagementController {
    private readonly sharesService;
    constructor(sharesService: SharesService);
    revokeShare(shareId: string, user: DevUserPayload): Promise<{
        message: string;
    }>;
}
