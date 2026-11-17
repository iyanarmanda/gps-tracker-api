import '@fastify/cookie';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { ACCESS_TOKEN_COOKIE } from '../constants/token.constant';

import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { JwtUserPayload } from '../interfaces/jwt-user.interface';
import type { AuthenticatedFastifyRequest } from '../interfaces/authenticated-fastify-request.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedFastifyRequest>();
    const token = request.cookies?.[ACCESS_TOKEN_COOKIE];

    if (!token) {
      throw new UnauthorizedException('Session not found');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtUserPayload>(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Session invalid');
    }
  }
}
