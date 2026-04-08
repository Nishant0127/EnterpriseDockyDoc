import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto, SearchResultDto } from './dto/search.dto';
import { DevAuthGuard, type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Search endpoint.
 * Route: GET /api/v1/search?workspaceId=...&q=...
 */
@ApiTags('Search')
@Controller('search')
@UseGuards(DevAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Search documents across name, description, tags, metadata, and file content',
  })
  @ApiResponse({ status: 200, type: [SearchResultDto] })
  search(
    @Query() query: SearchQueryDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<SearchResultDto[]> {
    return this.searchService.search(query, user);
  }
}
