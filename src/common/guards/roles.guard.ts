import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../constants/auth.constants';
import { Role } from '../enums/role.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user: JwtPayload = request.user;

    if (!requiredRoles.includes(user.role.toUpperCase() as Role)) {
      this.logger.warn(
        `Role denied: user=${user.email}, required=${requiredRoles.join(', ')}, actual=${user.role}`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
