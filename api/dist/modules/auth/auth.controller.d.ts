import { AuthService } from './auth.service';
import { type DevUserPayload } from '../../common/guards/dev-auth.guard';
import { MeResponseDto, SwitchWorkspaceDto, SwitchWorkspaceResponseDto, WorkspaceMembershipDto } from './dto/auth.dto';
declare class LoginDto {
    email: string;
    password: string;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    me(user: DevUserPayload): MeResponseDto;
    myWorkspaces(user: DevUserPayload): WorkspaceMembershipDto[];
    switchWorkspace(user: DevUserPayload, dto: SwitchWorkspaceDto): SwitchWorkspaceResponseDto;
    login(dto: LoginDto): Promise<{
        accessToken: string;
    }>;
    logout(): {
        message: string;
    };
}
export {};
