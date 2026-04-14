import { PrismaService } from '../../prisma/prisma.service';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import type { SearchQueryDto, SearchResultDto } from './dto/search.dto';
export declare class SearchService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    search(query: SearchQueryDto, user: DevUserPayload): Promise<SearchResultDto[]>;
}
