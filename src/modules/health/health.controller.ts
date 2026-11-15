import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { AppHealthIndicator } from './health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: AppHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.indicator.isApiHealthy(),
      () => this.indicator.isSqliteHealthy(),
      () => this.indicator.isRedisHealthy(),
      () => this.indicator.isMosquittoHealthy(),
    ]);
  }
}
