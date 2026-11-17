import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import type { JwtUserPayload } from './interfaces/jwt-user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  private safeCompareUsername(input: string, expected: string): boolean {
    const inputDigest = createHash('sha256').update(input).digest();
    const expectedDigest = createHash('sha256').update(expected).digest();
    return timingSafeEqual(inputDigest, expectedDigest);
  }

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<JwtUserPayload> {
    const validUser = this.configService.getOrThrow<string>('AUTH_USERNAME');
    const validPassHash =
      this.configService.getOrThrow<string>('AUTH_PASSWORD_HASH');
    const pepper = this.configService.getOrThrow<string>('AUTH_PEPPER');

    const isUserMatch = this.safeCompareUsername(username, validUser);
    const isPassMatch = await argon2.verify(validPassHash, password, {
      secret: Buffer.from(pepper),
    });

    if (!isUserMatch || !isPassMatch) {
      throw new UnauthorizedException('Username or password invalid');
    }

    return { sub: validUser, username: validUser };
  }

  async signAccessToken(payload: JwtUserPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
}
