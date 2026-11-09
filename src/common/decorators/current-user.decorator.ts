import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/** Payload put on req.user by JwtStrategy (passport-jwt). */
export interface JwtPayload {
  sub: number;
  user_id?: number;
  role?: string;
  exp?: number;
  iat?: number;
}

export function getRequestUserId(req: Request): number {
  const user = req.user as unknown as JwtPayload | undefined;
  const id = user?.sub ?? user?.user_id;
  if (id === undefined || id === null) {
    throw new Error('Missing authenticated user id on request');
  }
  return Number(id);
}

export function getRequestRole(req: Request): string | undefined {
  const user = req.user as unknown as JwtPayload | undefined;
  return user?.role;
}

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number =>
    getRequestUserId(ctx.switchToHttp().getRequest<Request>()),
);
