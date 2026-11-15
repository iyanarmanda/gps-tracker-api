import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { EnvModule } from './config/env.module';
import { MqttModule } from './config/mqtt/mqtt.module';
import { SQLiteModule } from './database/sqlite/sqlite.module';
import { RedisModule } from './database/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { DevicesModule } from './modules/devices/devices.module';

@Module({
  imports: [
    EnvModule,
    MqttModule,
    SQLiteModule,
    RedisModule,
    HealthModule,
    TelemetryModule,
    DevicesModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
