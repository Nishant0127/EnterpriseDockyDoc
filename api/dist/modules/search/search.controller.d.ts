import { SearchService } from './search.service';
import { SearchQueryDto, SearchResultDto } from './dto/search.dto';
import { type DevUserPayload } from '../../common/guards/dev-auth.guard';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    search(query: SearchQueryDto, user: DevUserPayload): Promise<SearchResultDto[]>;
}
