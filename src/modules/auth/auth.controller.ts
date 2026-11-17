import '@fastify/cookie';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ACCESS_TOKEN_COOKIE } from './constants/token.constant';
import { LoginDto } from './schemas/login.schema';

import type { FastifyReply } from 'fastify';
import type { AuthenticatedFastifyRequest } from './interfaces/authenticated-fastify-request.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions() {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const domain = this.configService.get<string>('COOKIE_DOMAIN')?.trim();

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }

  @Get()
  getMe(@Req() req: AuthenticatedFastifyRequest) {
    return {
      authenticated: true,
      user: { username: req.user?.username ?? '' },
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const user = await this.authService.validateCredentials(
      dto.username,
      dto.password,
    );
    const token = await this.authService.signAccessToken(user);

    reply.setCookie(ACCESS_TOKEN_COOKIE, token, {
      ...this.getCookieOptions(),
      maxAge: 60 * 60 * 12,
    });

    return {
      authenticated: true,
      user: { username: user.username },
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie(ACCESS_TOKEN_COOKIE, this.getCookieOptions());
    return { authenticated: false };
  }
}
