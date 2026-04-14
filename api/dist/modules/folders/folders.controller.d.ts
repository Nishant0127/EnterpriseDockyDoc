import { FoldersService } from './folders.service';
import { CreateFolderDto, FolderDetailResponseDto, FolderQueryDto, FolderResponseDto, UpdateFolderDto } from './dto/folder.dto';
import { type DevUserPayload } from '../../common/guards/dev-auth.guard';
export declare class FoldersController {
    private readonly foldersService;
    constructor(foldersService: FoldersService);
    findAll(query: FolderQueryDto, deleted: string, user: DevUserPayload): Promise<FolderResponseDto[]>;
    findOne(id: string, user: DevUserPayload): Promise<FolderDetailResponseDto>;
    create(dto: CreateFolderDto, user: DevUserPayload): Promise<FolderResponseDto>;
    rename(id: string, dto: UpdateFolderDto, user: DevUserPayload): Promise<FolderResponseDto>;
    restore(id: string, user: DevUserPayload): Promise<void>;
    delete(id: string, user: DevUserPayload): Promise<void>;
}
