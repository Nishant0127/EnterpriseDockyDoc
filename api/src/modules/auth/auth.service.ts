import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DevUserPayload } from '../../common/guards/dev-auth.guard';
import {
  MeResponseDto,
  WorkspaceMembershipDto,
  SwitchWorkspaceResponseDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  // ------------------------------------------------------------------ //
  // Current-user context (dev-safe, replaces with JWT later)
  // ------------------------------------------------------------------ //

  /**
   * Build the /me response from the already-resolved dev user payload.
   * Default workspace = first OWNER membership, or first membership otherwise.
   */
  getMe(devUser: DevUserPayload): MeResponseDto {
    const workspaces = this.buildMemberships(devUser);
    const defaultWorkspace =
      workspaces.find((w) => w.role === 'OWNER') ?? workspaces[0] ?? null;

    return {
      id: devUser.id,
      email: devUser.email,
      firstName: devUser.firstName,
      lastName: devUser.lastName,
      isActive: devUser.isActive,
      workspaces,
      defaultWorkspace,
    };
  }

  /**
   * Return only the workspace membership list for the current user.
   */
  getUserWorkspaces(devUser: DevUserPayload): WorkspaceMembershipDto[] {
    return this.buildMemberships(devUser);
  }

  /**
   * Validate that the current user belongs to the requested workspace,
   * then return the workspace + role context.
   *
   * No session is persisted here — the client stores the active workspace
   * in localStorage until real token-based context is implemented.
   */
  switchWorkspace(
    devUser: DevUserPayload,
    workspaceId: string,
  ): SwitchWorkspaceResponseDto {
    const membership = devUser.workspaces.find(
      (m) => m.workspaceId === workspaceId,
    );

    if (!membership) {
      throw new ForbiddenException(
        `User does not belong to workspace "${workspaceId}"`,
      );
    }

    return {
      workspaceId: membership.workspaceId,
      workspaceName: membership.workspace.name,
      workspaceSlug: membership.workspace.slug,
      workspaceType: membership.workspace.type,
      role: membership.role,
    };
  }

  // ------------------------------------------------------------------ //
  // Stubbed login (to be implemented with real JWT)
  // ------------------------------------------------------------------ //

  async validateUser(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string } | null> {
    void email;
    void password;
    throw new UnauthorizedException('Password login not implemented yet');
  }

  async login(_userId: string): Promise<{ accessToken: string }> {
    throw new UnauthorizedException('JWT login not implemented yet');
  }

  // ------------------------------------------------------------------ //
  // Private helpers
  // ------------------------------------------------------------------ //

  private buildMemberships(devUser: DevUserPayload): WorkspaceMembershipDto[] {
    return devUser.workspaces.map((m) => ({
      workspaceId: m.workspaceId,
      workspaceName: m.workspace.name,
      workspaceSlug: m.workspace.slug,
      workspaceType: m.workspace.type,
      role: m.role,
      status: m.status,
    }));
  }
}
