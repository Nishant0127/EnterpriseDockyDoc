export declare function generateShareToken(): string;
export declare function hashPassword(password: string): string;
export declare function verifyPassword(password: string, stored: string): boolean;
export declare function createAccessGrant(shareId: string): {
    grant: string;
    expiresIn: number;
};
export declare function verifyAccessGrant(grant: string): string | null;
