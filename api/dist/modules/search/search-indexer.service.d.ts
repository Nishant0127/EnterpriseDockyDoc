import { PrismaService } from '../../prisma/prisma.service';
import { TextExtractorService } from './text-extractor.service';
export declare class SearchIndexerService {
    private readonly prisma;
    private readonly extractor;
    private readonly logger;
    constructor(prisma: PrismaService, extractor: TextExtractorService);
    indexDocument(documentId: string, file?: Express.Multer.File): Promise<void>;
}
