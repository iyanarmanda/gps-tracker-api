import fastifyCookie from '@fastify/cookie';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { AppModule } from '../../src/app.module';

export const TEST_AUTH = {
  username: process.env.AUTH_USERNAME ?? 'e2e-username',
  password: 'e2e-password',
  pepper: process.env.AUTH_PEPPER ?? 'e2e-pepper',
} as const;

export async function waitForCondition(
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

export async function createTestApp(options?: {
  withMqtt?: boolean;
}): Promise<{ app: NestFastifyApplication; baseUrl: string }> {
  const testPasswordHash = await argon2.hash(TEST_AUTH.password, {
    type: argon2.argon2id,
    secret: Buffer.from(TEST_AUTH.pepper),
  });

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ trustProxy: true }),
  );

  const authOverrides: Record<string, string> = {
    AUTH_USERNAME: TEST_AUTH.username,
    AUTH_PEPPER: TEST_AUTH.pepper,
    AUTH_PASSWORD_HASH: testPasswordHash,
  };

  const configService = app.get(ConfigService);
  const originalGetOrThrow = configService.getOrThrow.bind(configService);
  configService.getOrThrow = ((propertyPath: string) => {
    if (propertyPath in authOverrides) {
      return authOverrides[propertyPath];
    }
    return originalGetOrThrow(propertyPath);
  }) as ConfigService['getOrThrow'];

  await app.register(
    (fastifyCookie as unknown as { default?: typeof fastifyCookie }).default ??
      fastifyCookie,
  );

  if (options?.withMqtt) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: {
        url: process.env.MQTT_URL,
        username: process.env.MQTT_USER,
        password: process.env.MQTT_PASSWORD,
      },
    });
  }

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  await app.init();
  if (options?.withMqtt) {
    await app.startAllMicroservices();
  }
  await app.listen(0, '127.0.0.1');

  const baseUrl = await app.getUrl();
  return { app, baseUrl };
}

export async function loginAndGetCookie(
  app: NestFastifyApplication,
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      username: TEST_AUTH.username,
      password: TEST_AUTH.password,
    },
  });

  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to login in E2E setup (${String(response.statusCode)})`,
    );
  }

  const tokenCookie = response.cookies.find((c) => c.name === 'access_token');
  if (!tokenCookie) {
    throw new Error('access_token cookie was not set on login response');
  }

  return `access_token=${tokenCookie.value}`;
}
