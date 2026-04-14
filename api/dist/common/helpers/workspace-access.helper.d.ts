import type { DevUserPayload } from '../guards/dev-auth.guard';
export declare function assertWorkspaceMembership(user: DevUserPayload, workspaceId: string): void;
export declare function assertEditorOrAbove(user: DevUserPayload, workspaceId: string): void;
export declare function assertAdminOrAbove(user: DevUserPayload, workspaceId: string): void;
