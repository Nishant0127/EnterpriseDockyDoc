import { TagsService } from './tags.service';
import { CreateTagDto, TagQueryDto, TagResponseDto, UpdateTagDto } from './dto/tag.dto';
import { type DevUserPayload } from '../../common/guards/dev-auth.guard';
export declare class TagsController {
    private readonly tagsService;
    constructor(tagsService: TagsService);
    findAll(query: TagQueryDto, user: DevUserPayload): Promise<TagResponseDto[]>;
    create(dto: CreateTagDto, user: DevUserPayload): Promise<TagResponseDto>;
    update(id: string, dto: UpdateTagDto, user: DevUserPayload): Promise<TagResponseDto>;
    delete(id: string, user: DevUserPayload): Promise<void>;
}
