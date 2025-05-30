import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { AuthService } from '../servicios/auth.service';
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new ForbiddenException('Acceso denegado');
    }
    let payload;
    try {
      payload = this.authService.verifyToken(token);
    } catch (error) {
      const errorResult =
        error.name == 'TokenExpiredError' ? 'La sesión ha expirado' : error;
      throw new UnauthorizedException(errorResult);
    }
    const userRole = payload.rol;
    const allowAccess = requiredRoles.includes(userRole);
    if (!allowAccess || userRole == 'SIN_APROBACION')
      throw new ForbiddenException('Acceso denegado');
    request.user = {
      id: payload.sub,
      email: payload.email,
      role: userRole,
      comunidad: payload.comunidad,
    };
    return allowAccess;
  }
}
