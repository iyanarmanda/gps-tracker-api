import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TelemetryService } from './telemetry.service';

import type { TelemetryPayloadDto } from './schemas/telemetry.schema';

@Controller()
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(private readonly telemetryService: TelemetryService) {}

  @EventPattern('tracker/devices/+/telemetry')
  async handleTelemetry(
    @Payload() payload: TelemetryPayloadDto,
  ): Promise<void> {
    await this.telemetryService.saveTelemetry(payload);
  }
}
