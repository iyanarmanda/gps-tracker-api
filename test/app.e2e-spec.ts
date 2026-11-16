import { VersioningType } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Redis from 'ioredis';
import { connectAsync, MqttClient } from 'mqtt';
import { AppModule } from '../src/app.module';
import * as schema from '../src/database/sqlite/schemas/devices.schema';
import { devices } from '../src/database/sqlite/schemas/devices.schema';
import { REDIS_CLIENT } from '../src/database/redis/redis.constant';

async function waitForCondition(
  conditionFn: () => Promise<boolean>,
  timeoutMs = 3000,
  intervalMs = 50,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await conditionFn()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Condition not met within ${String(timeoutMs)}ms`);
}

describe('GPS Tracker API & MQTT (e2e)', () => {
  let app: NestFastifyApplication;
  let baseUrl: string;
  let db: BetterSQLite3Database<typeof schema>;
  let redis: Redis;
  let virtualEsp: MqttClient;

  const TEST_ESP_ID = 'esp32:test-01';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: {
        url: process.env.MQTT_URL,
        username: process.env.MQTT_USER,
        password: process.env.MQTT_PASSWORD,
      },
    });

    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();
    await app.startAllMicroservices();
    await app.listen(0, '127.0.0.1');

    baseUrl = await app.getUrl();

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

  describe('GET /api/v1/health', () => {
    it('should return status ok for API, SQLite, Redis, and Mosquitto', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<{ status: string }>();
      expect(body.status).toBe('ok');
    });
  });

  describe('GET /api/v1/devices', () => {
    it('should return all devices from SQLite with last location from Redis', async () => {
      await redis.hset(`device:${TEST_ESP_ID}:location`, {
        lat: '-7.257472',
        lng: '112.752088',
        speed: '12.5',
        satelite: '7',
        active: 'true',
        updated_at: '1793701140',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/devices',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<Array<Record<string, unknown>>>();

      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        espId: TEST_ESP_ID,
        name: 'Test Unit 01',
        isActive: false,
        interval: 10,
        location: {
          lat: -7.257472,
          lng: 112.752088,
          speed: 12.5,
          satellites: 7,
          updatedAt: 1793701140,
        },
      });
    });
  });

  describe('SSE /api/v1/devices/stream', () => {
    it('should stream event telemetry in real-time while ESP32 send geo data', async () => {
      const abortController = new AbortController();

      try {
        const response = await fetch(`${baseUrl}/api/v1/devices/stream`, {
          signal: abortController.signal,
          headers: { Accept: 'text/event-stream' },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain(
          'text/event-stream',
        );

        const reader = response.body?.getReader();
        expect(reader).toBeDefined();

        const telemetryTopic = `tracker/devices/${TEST_ESP_ID}/telemetry`;
        await virtualEsp.publishAsync(
          telemetryTopic,
          JSON.stringify({
            device_id: TEST_ESP_ID,
            lat: -7.257472,
            lng: 112.752088,
            speed: 30.2,
            satellites: 10,
            timestamp: 1793701200,
          }),
        );

        const decoder = new TextDecoder();
        let receivedChunk = '';

        while (!receivedChunk.includes('data:')) {
          const { value, done } = await reader!.read();
          if (done) break;
          receivedChunk += decoder.decode(value, { stream: true });
        }

        expect(receivedChunk).toContain('event: telemetry');
        expect(receivedChunk).toContain(`"espId":"${TEST_ESP_ID}"`);
        expect(receivedChunk).toContain('"lat":-7.257472');
      } finally {
        abortController.abort();
      }
    });
  });

  describe('PATCH /api/v1/devices/:espId/command', () => {
    it('should update SQLite, synchronize Redis, and publish command to ESP32 via MQTT', async () => {
      const commandTopic = `tracker/devices/${TEST_ESP_ID}/command`;
      await virtualEsp.subscribeAsync(commandTopic);

      const receivedCommandPromise = new Promise<Record<string, unknown>>(
        (resolve) => {
          virtualEsp.once('message', (topic, message) => {
            if (topic === commandTopic) {
              resolve(
                JSON.parse(message.toString()) as Record<string, unknown>,
              );
            }
          });
        },
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/devices/${TEST_ESP_ID}/command`,
        payload: {
          active: true,
          interval: 5,
        },
      });

      expect(response.statusCode).toBe(200);

      const mqttPayload = await receivedCommandPromise;
      expect(mqttPayload).toMatchObject({
        device_id: TEST_ESP_ID,
        active: true,
        interval_seconds: 5,
      });

      const updatedDevice = await db
        .select()
        .from(devices)
        .where(eq(devices.espId, TEST_ESP_ID))
        .get();
      expect(updatedDevice?.isActive).toBe(true);
      expect(updatedDevice?.interval).toBe(5);

      const redisActive = await redis.hget(
        `device:${TEST_ESP_ID}:location`,
        'active',
      );
      expect(redisActive).toBe('true');
    });

    it('should reject invalid payload with HTTP 400 (ZodValidationPipe)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/devices/${TEST_ESP_ID}/command`,
        payload: {
          active: 'bukan-boolean',
          interval: -10,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return HTTP 404 if esp_id not registered', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/devices/esp32:tidak-ada/command',
        payload: {
          active: true,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('MQTT Telemetry Ingestion (ESP32 -> Broker -> API -> Redis)', () => {
    it('should save geo data to Redis Hash dan GeoSpatial Index on telemetry entry', async () => {
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
