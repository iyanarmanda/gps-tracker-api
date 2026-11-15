import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { AppHealthIndicator } from './health.indicator';

@Module({
  imports: [TerminusModule, ConfigModule],
  controllers: [HealthController],
  providers: [AppHealthIndicator],
})
export class HealthModule {}
