import { getDrizzleToken } from '@nestjs/drizzle';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Redis from 'ioredis';
import { connectAsync, MqttClient } from 'mqtt';
import { REDIS_CLIENT } from '../src/database/redis/redis.constant';
import * as schema from '../src/database/sqlite/schemas/devices.schema';
import { devices } from '../src/database/sqlite/schemas/devices.schema';
import { createTestApp, waitForCondition } from './helpers/test-app.helper';

describe('TelemetryModule (e2e)', () => {
  let app: NestFastifyApplication;
  let db: BetterSQLite3Database<typeof schema>;
  let redis: Redis;
  let virtualEsp: MqttClient;

  const TEST_ESP_ID = 'esp32:test-01';

  beforeAll(async () => {
    const testApp = await createTestApp({ withMqtt: true });
    app = testApp.app;

    db = app.get<BetterSQLite3Database<typeof schema>>(getDrizzleToken());
    redis = app.get<Redis>(REDIS_CLIENT);

    virtualEsp = await connectAsync(
      process.env.MQTT_URL ?? 'mqtt://localhost:1883',
      {
        username: process.env.MQTT_USER,
        password: process.env.MQTT_PASSWORD,
      },
    );
  });

  beforeEach(async () => {
    await redis.flushdb();
    await db.delete(devices);
    await db.insert(devices).values({
      espId: TEST_ESP_ID,
      name: 'Test Unit 01',
      isActive: false,
      interval: 10,
    });
  });

  afterAll(async () => {
    await virtualEsp.endAsync(true);
    await app.close();
  });

  describe('MQTT Telemetry Ingestion (ESP32 -> Broker -> API -> Redis)', () => {
    it('should save geo data to Redis Hash and GeoSpatial Index on telemetry entry', async () => {
      const telemetryTopic = `tracker/devices/${TEST_ESP_ID}/telemetry`;
      const sampleTelemetry = {
        device_id: TEST_ESP_ID,
        lat: -7.257472,
        lng: 112.752088,
        speed: 22.5,
        satellites: 9,
        timestamp: 1793701140,
      };

      await virtualEsp.publishAsync(
        telemetryTopic,
        JSON.stringify(sampleTelemetry),
      );

      await waitForCondition(async () => {
        const exists = await redis.exists(`device:${TEST_ESP_ID}:location`);
        return exists === 1;
      });

      const locationHash = await redis.hgetall(
        `device:${TEST_ESP_ID}:location`,
      );
      expect(locationHash).toEqual({
        lat: '-7.257472',
        lng: '112.752088',
        speed: '22.5',
        satelite: '9',
        active: 'true',
        updated_at: '1793701140',
      });

      const geoPos = await redis.geopos('active_trackers', TEST_ESP_ID);
      expect(geoPos[0]).not.toBeNull();
    });
  });
});
