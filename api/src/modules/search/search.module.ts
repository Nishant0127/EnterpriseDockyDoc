import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchIndexerService } from './search-indexer.service';
import { TextExtractorService } from './text-extractor.service';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';

@Module({
  controllers: [SearchController],
  providers: [
    SearchController,
    SearchService,
    SearchIndexerService,
    TextExtractorService,
    DevAuthGuard,
  ],
  exports: [SearchIndexerService],
})
export class SearchModule {}
