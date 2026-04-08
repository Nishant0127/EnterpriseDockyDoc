import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto, TagQueryDto, TagResponseDto } from './dto/tag.dto';
import { DevAuthGuard, type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tags')
@Controller('tags')
@UseGuards(DevAuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /**
   * GET /api/v1/tags?workspaceId=...
   */
  @Get()
  @ApiOperation({ summary: 'List all tags in a workspace' })
  @ApiResponse({ status: 200, type: [TagResponseDto] })
  findAll(
    @Query() query: TagQueryDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<TagResponseDto[]> {
    return this.tagsService.findAll(query.workspaceId, user);
  }

  /**
   * POST /api/v1/tags
   */
  @Post()
  @ApiOperation({ summary: 'Create a document tag' })
  @ApiResponse({ status: 201, type: TagResponseDto })
  create(
    @Body() dto: CreateTagDto,
    @CurrentUser() user: DevUserPayload,
  ): Promise<TagResponseDto> {
    return this.tagsService.create(dto, user);
  }
}
