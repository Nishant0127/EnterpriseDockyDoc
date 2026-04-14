export declare class TextExtractorService {
    private readonly logger;
    extract(buffer: Buffer, mimeType: string, fileName: string): Promise<string | null>;
    private extractPdf;
    private extractWord;
}
