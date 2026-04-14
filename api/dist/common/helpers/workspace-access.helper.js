"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertWorkspaceMembership = assertWorkspaceMembership;
exports.assertEditorOrAbove = assertEditorOrAbove;
exports.assertAdminOrAbove = assertAdminOrAbove;
const common_1 = require("@nestjs/common");
const ROLE_RANK = {
    OWNER: 4,
    ADMIN: 3,
    EDITOR: 2,
    VIEWER: 1,
};
function getMembership(user, workspaceId) {
    return user.workspaces.find((m) => m.workspaceId === workspaceId && m.status === 'ACTIVE');
}
function assertWorkspaceMembership(user, workspaceId) {
    if (!getMembership(user, workspaceId)) {
        throw new common_1.ForbiddenException(`You do not have access to workspace "${workspaceId}"`);
    }
}
function assertEditorOrAbove(user, workspaceId) {
    const membership = getMembership(user, workspaceId);
    if (!membership) {
        throw new common_1.ForbiddenException(`You do not have access to workspace "${workspaceId}"`);
    }
    if (ROLE_RANK[membership.role] < ROLE_RANK.EDITOR) {
        throw new common_1.ForbiddenException('Viewers cannot perform write operations. Contact an Admin or Owner to change your role.');
    }
}
function assertAdminOrAbove(user, workspaceId) {
    const membership = getMembership(user, workspaceId);
    if (!membership) {
        throw new common_1.ForbiddenException(`You do not have access to workspace "${workspaceId}"`);
    }
    if (ROLE_RANK[membership.role] < ROLE_RANK.ADMIN) {
        throw new common_1.ForbiddenException('Only Admins and Owners can perform this action.');
    }
}
//# sourceMappingURL=workspace-access.helper.js.map