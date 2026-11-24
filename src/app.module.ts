import { Module } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { EnvModule } from './config/env/env.module';
import { MqttModule } from './config/mqtt/mqtt.module';
import { SQLiteModule } from './database/sqlite/sqlite.module';
import { RedisModule } from './database/redis/redis.module';
import { JwtModule } from './config/jwt/jwt.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { DevicesModule } from './modules/devices/devices.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    EnvModule,
    MqttModule,
    SQLiteModule,
    RedisModule,
    JwtModule,
    HealthModule,
    AuthModule,
    TelemetryModule,
    DevicesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
