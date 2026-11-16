import { Inject, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq, asc } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Redis from 'ioredis';
import * as schema from '../../database/sqlite/schemas/devices.schema';
import { devices } from '../../database/sqlite/schemas/devices.schema';
import { REDIS_CLIENT } from '../../database/redis/redis.constant';

import type { UpdateDeviceStateInput } from './interfaces/update-device-state.interface';
import type { UpdateTelemetryLocationInput } from './interfaces/update-telemetry-location.interface';
import type { DeviceLocationSnapshot } from './interfaces/device-location-snapshot.interface';

@Injectable()
export class DevicesRepository {
  private readonly GEO_INDEX_KEY = 'active_trackers';

  constructor(
    @InjectDrizzle()
    private readonly db: BetterSQLite3Database<typeof schema>,

    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async findAll() {
    return this.db.select().from(devices).orderBy(asc(devices.id)).all();
  }

  async findByEspId(espId: string) {
    return this.db.select().from(devices).where(eq(devices.espId, espId)).get();
  }

  async updateCommandState(espId: string, data: UpdateDeviceStateInput) {
    const [updatedDevice] = await this.db
      .update(devices)
      .set({
        isActive: data.isActive,
        interval: data.interval,
        activatedAt: data.activatedAt,
      })
      .where(eq(devices.espId, espId))
      .returning();

    return updatedDevice;
  }

  async getLocationsByEspIds(espIds: string[]) {
    const result = new Map<string, DeviceLocationSnapshot | null>();
    if (espIds.length === 0) return result;

    const pipeline = this.redis.pipeline();
    for (const espId of espIds) {
      pipeline.hgetall(`device:${espId}:location`);
    }

    const responses = await pipeline.exec();

    espIds.forEach((espId, index) => {
      const [err, raw] = responses?.[index] ?? [null, null];
      const hash = raw as Record<string, string> | null;

      // Pastikan koordinat tersedia (karena sendCommand hanya menulis active & updated_at)
      if (err || !hash || hash.lat === undefined || hash.lng === undefined) {
        result.set(espId, null);
        return;
      }

      result.set(espId, {
        lat: Number(hash.lat),
        lng: Number(hash.lng),
        speed: Number(hash.speed ?? 0),
        satellites: Number(hash.satelite ?? 0),
        updatedAt: Number(hash.updated_at ?? 0),
      });
    });

    return result;
  }

  async syncRedisState(
    espId: string,
    isActive: boolean,
    unixTimestamp: number,
  ): Promise<void> {
    const locationKey = `device:${espId}:location`;

    if (isActive) {
      await this.redis.hset(locationKey, {
        active: 'true',
        updated_at: String(unixTimestamp),
      });
      return;
    }

    await this.redis
      .multi()
      .hset(locationKey, {
        active: 'false',
        updated_at: String(unixTimestamp),
      })
      .zrem(this.GEO_INDEX_KEY, espId)
      .exec();
  }

  async updateTelemetryLocation(
    data: UpdateTelemetryLocationInput,
  ): Promise<void> {
    const locationKey = `device:${data.espId}:location`;

    await this.redis
      .multi()
      .hset(locationKey, {
        lat: String(data.lat),
        lng: String(data.lng),
        speed: String(data.speed),
        satelite: String(data.satellites),
        active: 'true',
        updated_at: String(data.updatedAt),
      })
      .geoadd(this.GEO_INDEX_KEY, data.lng, data.lat, data.espId)
      .exec();
  }
}
