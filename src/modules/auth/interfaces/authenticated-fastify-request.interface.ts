import type { FastifyRequest } from 'fastify';
import type { JwtUserPayload } from './jwt-user.interface';

export interface AuthenticatedFastifyRequest extends FastifyRequest {
  user?: JwtUserPayload;
}
