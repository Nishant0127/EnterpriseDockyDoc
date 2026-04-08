import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { assertWorkspaceMembership } from '../../common/helpers/workspace-access.helper';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CreateTagDto, TagResponseDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string, user: DevUserPayload): Promise<TagResponseDto[]> {
    assertWorkspaceMembership(user, workspaceId);

    return this.prisma.documentTag.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateTagDto, user: DevUserPayload): Promise<TagResponseDto> {
    assertWorkspaceMembership(user, dto.workspaceId);

    return this.prisma.documentTag.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name,
        color: dto.color ?? null,
      },
    });
  }
}
