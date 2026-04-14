import type { Request, Response } from 'express';
import { SharesService } from './shares.service';
import { PublicShareInfoDto, VerifySharePasswordDto, VerifyShareResponseDto } from './dto/share.dto';
export declare class PublicSharesController {
    private readonly sharesService;
    constructor(sharesService: SharesService);
    getShareInfo(token: string, req: Request): Promise<PublicShareInfoDto>;
    verifyPassword(token: string, dto: VerifySharePasswordDto, req: Request): Promise<VerifyShareResponseDto>;
    download(token: string, grant: string | undefined, req: Request, res: Response): Promise<void>;
}
