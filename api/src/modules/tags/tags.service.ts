import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  assertWorkspaceMembership,
  assertEditorOrAbove,
} from '../../common/helpers/workspace-access.helper';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import { CreateTagDto, TagResponseDto, UpdateTagDto } from './dto/tag.dto';

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
    assertEditorOrAbove(user, dto.workspaceId);

    return this.prisma.documentTag.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name,
        color: dto.color ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateTagDto, user: DevUserPayload): Promise<TagResponseDto> {
    const tag = await this.prisma.documentTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException(`Tag "${id}" not found`);
    assertEditorOrAbove(user, tag.workspaceId);

    return this.prisma.documentTag.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });
  }

  async delete(id: string, user: DevUserPayload): Promise<void> {
    const tag = await this.prisma.documentTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException(`Tag "${id}" not found`);
    assertEditorOrAbove(user, tag.workspaceId);

    await this.prisma.documentTag.delete({ where: { id } });
  }
}
