import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../database/redis/redis.constant';

import type { TelemetryPayloadSchema } from './schemas/telemetry.schema';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly GEO_INDEX_KEY = 'active_trackers';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async saveTelemetry(payload: TelemetryPayloadSchema): Promise<void> {
    const locationKey = `device:${payload.device_id}:location`;
    const updatedAt = payload.timestamp ?? Math.floor(Date.now() / 1000);

    await this.redis
      .multi()
      .hset(locationKey, {
        lat: String(payload.lat),
        lng: String(payload.lng),
        speed: String(payload.speed),
        satelite: String(payload.satellites),
        active: 'true',
        updated_at: String(updatedAt),
      })
      .geoadd(
        this.GEO_INDEX_KEY,
        payload.lng,
        payload.lat,
        payload.device_id,
      )
      .exec();

    this.logger.debug(
      `Telemetry updated [${payload.device_id}] -> (${payload.lat}, ${payload.lng})`,
    );
  }
}
