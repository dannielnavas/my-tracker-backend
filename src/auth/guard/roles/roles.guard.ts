import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ROLES_KEY } from 'src/auth/decorators/roles.decorator';
import { ERoles } from 'src/auth/models/roles.model';
import { Token } from 'src/auth/models/token.model';

@Injectable()
//TODO: implement implementa una interfaz extends hereda
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles: ERoles[] = this.reflector.get<ERoles[]>(
      ROLES_KEY,
      context.getHandler(),
    );
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as Token;
    // TODO: some busca uno por uno los valores del array y si encuentra uno que cumpla con la condicion retorna true
    const isAuth = roles.some((role) => role === user.role);
    if (!isAuth) {
      throw new UnauthorizedException(
        'No tienes permisos para realizar esta accion',
      );
    }
    return isAuth;
  }
}
