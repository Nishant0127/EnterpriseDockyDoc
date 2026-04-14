export declare class TagQueryDto {
    workspaceId: string;
}
export declare class CreateTagDto {
    workspaceId: string;
    name: string;
    color?: string;
}
export declare class UpdateTagDto {
    name?: string;
    color?: string | null;
}
export declare class TagResponseDto {
    id: string;
    workspaceId: string;
    name: string;
    color: string | null;
    createdAt: Date;
    updatedAt: Date;
}
