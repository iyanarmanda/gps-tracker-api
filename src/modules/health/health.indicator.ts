import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDrizzle } from '@nestjs/drizzle';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Redis from 'ioredis';
import { connect } from 'mqtt';
import * as schema from '../../database/sqlite/schemas';
import { REDIS_CLIENT } from '../../database/redis/redis.constant';

@Injectable()
export class AppHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,

    private readonly configService: ConfigService,

    @InjectDrizzle()
    private readonly db: BetterSQLite3Database<typeof schema>,

    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  isApiHealthy(): HealthIndicatorResult {
    return this.healthIndicatorService.check('api').up({
      uptime: Math.floor(process.uptime()),
    });
  }

  isSqliteHealthy(): HealthIndicatorResult {
    const indicator = this.healthIndicatorService.check('sqlite');
    try {
      this.db.run(sql`SELECT 1`);
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    }
  }

  async isRedisHealthy(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('redis');
    try {
      await this.redis.ping();
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    }
  }

  async isMosquittoHealthy(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('mosquitto');
    const url = this.configService.getOrThrow<string>('MQTT_URL');
    const username = this.configService.getOrThrow<string>('MQTT_USER');
    const password = this.configService.getOrThrow<string>('MQTT_PASSWORD');

    return new Promise((resolve) => {
      let settled = false;

      const client = connect(url, {
        username,
        password,
        connectTimeout: 3000,
        reconnectPeriod: 0,
      });

      const finish = (result: HealthIndicatorResult) => {
        if (settled) return;
        settled = true;
        client.end(true);
        resolve(result);
      };

      client.once('connect', () => finish(indicator.up()));
      client.once('error', (err) =>
        finish(indicator.down({ message: err.message })),
      );
    });
  }
}
