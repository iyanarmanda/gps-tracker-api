import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import fastifyCookie from '@fastify/cookie';
import helmet from 'helmet';
import { CorsConfig } from './config/cors.config';
import { AppModule } from './app.module';

import type { NestFastifyApplication } from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
  );

  const configService = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: {
      url: configService.getOrThrow<string>('MQTT_URL'),
      username: configService.getOrThrow<string>('MQTT_USER'),
      password: configService.getOrThrow<string>('MQTT_PASSWORD'),
    },
  });

  app.use(helmet());

  await app.register(fastifyCookie);

  app.enableCors(CorsConfig(configService));

  await app.startAllMicroservices();

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const port = configService.get<number>('PORT', 3000);

  await app.listen(port, '127.0.0.1');
}
void bootstrap();
