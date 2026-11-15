import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MqttContext, Payload } from '@nestjs/microservices';
import { telemetryPayloadSchema } from './schemas/telemetry.schema';
import { TelemetryService } from './telemetry.service';

@Controller()
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(private readonly telemetryService: TelemetryService) {}

  @EventPattern('tracker/devices/+/telemetry')
  async handleTelemetry(
    @Payload() rawPayload: unknown,
  ): Promise<void> {
    const parsed = telemetryPayloadSchema.safeParse(rawPayload);

    if (!parsed.success) {
      this.logger.warn(
        `Invalid telemetry payload: ${parsed.error.message}`,
      );
      return;
    }

    await this.telemetryService.saveTelemetry(parsed.data);
  }
}
