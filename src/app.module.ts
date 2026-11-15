import { Module } from '@nestjs/common';
import { EnvModule } from './config/env.module';
import { SQLiteModule } from './database/sqlite/sqlite.module';
import { RedisModule } from './database/redis/redis.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [EnvModule, SQLiteModule, RedisModule, HealthModule],
})
export class AppModule {}
