import { Injectable } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assertWorkspaceMembership } from '../../common/helpers/workspace-access.helper';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import type { SearchQueryDto, SearchResultDto } from './dto/search.dto';

// Prisma include shape for search results
const SEARCH_INCLUDE = {
  folder: { select: { id: true, name: true } },
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
  searchContent: { select: { extractedText: true } },
  _count: { select: { versions: true } },
} as const;

/**
 * Build a short text snippet around the first match of `query` in `text`.
 * Returns undefined if `query` is not found.
 */
function buildSnippet(
  text: string | null | undefined,
  query: string,
  contextChars = 120,
): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return undefined;

  const start = Math.max(0, idx - Math.floor(contextChars / 2));
  const end = Math.min(text.length, idx + query.length + Math.ceil(contextChars / 2));
  const raw = text.slice(start, end).replace(/\s+/g, ' ').trim();

  return (start > 0 ? '…' : '') + raw + (end < text.length ? '…' : '');
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    query: SearchQueryDto,
    user: DevUserPayload,
  ): Promise<SearchResultDto[]> {
    assertWorkspaceMembership(user, query.workspaceId);

    const q = query.q.trim();

    const docs = await this.prisma.document.findMany({
      where: {
        workspaceId: query.workspaceId,
        status: query.status ?? { not: DocumentStatus.DELETED },
        ...(query.folderId && { folderId: query.folderId }),
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { fileName: { contains: q, mode: 'insensitive' } },
          { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
          { metadata: { some: { value: { contains: q, mode: 'insensitive' } } } },
          { metadata: { some: { key: { contains: q, mode: 'insensitive' } } } },
          {
            searchContent: {
              extractedText: { contains: q, mode: 'insensitive' },
            },
          },
        ],
      },
      include: SEARCH_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return docs.map((doc) => {
      const snippet = buildSnippet(doc.searchContent?.extractedText, q);

      return {
        id: doc.id,
        workspaceId: doc.workspaceId,
        name: doc.name,
        description: doc.description,
        fileName: doc.fileName,
        fileType: doc.fileType,
        status: doc.status,
        currentVersionNumber: doc.currentVersionNumber,
        folder: doc.folder,
        owner: doc.owner,
        tags: doc.tags.map((t) => t.tag),
        versionCount: doc._count.versions,
        snippet,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });
  }
}
