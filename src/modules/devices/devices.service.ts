import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { ClientProxy } from '@nestjs/microservices';
import { eq } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Redis from 'ioredis';
import { lastValueFrom } from 'rxjs';
import * as schema from '../../database/sqlite/schemas/devices.schema';
import { devices } from '../../database/sqlite/schemas/devices.schema';
import { REDIS_CLIENT } from '../../database/redis/redis.constant';
import { MQTT_CLIENT } from '../../config/mqtt/mqtt.constant';

import type { SendCommandSchema } from './schemas/send-command.schema';
import type { DeviceCommandPayload } from './interfaces/device-command.interface'

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);
  private readonly GEO_INDEX_KEY = 'active_trackers';

  constructor(
    @InjectDrizzle()
    private readonly db: BetterSQLite3Database<typeof schema>,

    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,

    @Inject(MQTT_CLIENT)
    private readonly mqttClient: ClientProxy,
  ) {}

  async sendCommand(espId: string, dto: SendCommandSchema) {
    const existing = await this.db
      .select()
      .from(devices)
      .where(eq(devices.espId, espId))
      .get();

    if (!existing) {
      throw new NotFoundException(`Device with esp_id "${espId}" not found`);
    }

    const nextInterval = dto.interval ?? existing.interval;
    const now = new Date();
    const unixTimestamp = Math.floor(now.getTime() / 1000);

    const [updatedDevice] = await this.db
      .update(devices)
      .set({
        isActive: dto.active,
        interval: nextInterval,
        activatedAt: dto.active ? (existing.activatedAt ?? now) : null,
      })
      .where(eq(devices.espId, espId))
      .returning();

    const locationKey = `device:${espId}:location`;
    if (dto.active) {
      await this.redis.hset(locationKey, {
        active: 'true',
        updated_at: String(unixTimestamp),
      });
    } else {
      await this.redis
        .multi()
        .hset(locationKey, {
          active: 'false',
          updated_at: String(unixTimestamp),
        })
        .zrem(this.GEO_INDEX_KEY, espId)
        .exec();
    }

    const topic = `tracker/devices/${espId}/command`;
    const commandPayload: DeviceCommandPayload = {
      device_id: espId,
      active: dto.active,
      interval_seconds: nextInterval,
      timestamp: unixTimestamp,
    };

    await lastValueFrom(this.mqttClient.emit(topic, commandPayload));

    this.logger.log(
      `Published command to "${topic}": active=${String(dto.active)}, interval=${String(nextInterval)}s`,
    );

    return {
      device: updatedDevice,
      published: {
        topic,
        payload: commandPayload,
      },
    };
  }
}
