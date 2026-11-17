import { Injectable } from '@nestjs/common';
import {
  ThrottlerException,
  ThrottlerGuard as ThrottlerBaseGuard,
} from '@nestjs/throttler';

import type { FastifyRequest } from 'fastify';

@Injectable()
export class ThrottlerGuard extends ThrottlerBaseGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as FastifyRequest;

    const cfIp = request.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim().length > 0) {
      return Promise.resolve(cfIp.trim());
    }

    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
      return Promise.resolve(forwardedFor.split(',')[0].trim());
    }

    return Promise.resolve(request.ip ?? 'unknown');
  }

  protected override throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Too many atempt. Try again later.');
  }
}
