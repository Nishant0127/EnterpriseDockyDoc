import { PrismaService } from '../../prisma/prisma.service';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CreateFolderDto, FolderDetailResponseDto, FolderResponseDto, UpdateFolderDto } from './dto/folder.dto';
export declare class FoldersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(workspaceId: string, user: DevUserPayload): Promise<FolderResponseDto[]>;
    findDeleted(workspaceId: string, user: DevUserPayload): Promise<FolderResponseDto[]>;
    findById(id: string, user: DevUserPayload): Promise<FolderDetailResponseDto>;
    create(dto: CreateFolderDto, user: DevUserPayload): Promise<FolderResponseDto>;
    rename(id: string, dto: UpdateFolderDto, user: DevUserPayload): Promise<FolderResponseDto>;
    delete(id: string, user: DevUserPayload): Promise<void>;
    restore(id: string, user: DevUserPayload): Promise<void>;
    private collectDescendants;
    private collectDeletedDescendants;
}
