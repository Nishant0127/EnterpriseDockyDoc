import { PrismaService } from '../../prisma/prisma.service';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CreateTagDto, TagResponseDto, UpdateTagDto } from './dto/tag.dto';
export declare class TagsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(workspaceId: string, user: DevUserPayload): Promise<TagResponseDto[]>;
    create(dto: CreateTagDto, user: DevUserPayload): Promise<TagResponseDto>;
    update(id: string, dto: UpdateTagDto, user: DevUserPayload): Promise<TagResponseDto>;
    delete(id: string, user: DevUserPayload): Promise<void>;
}
