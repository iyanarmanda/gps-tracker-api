import { Inject, Injectable } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service';

import type { TelemetryPayloadDto } from './schemas/telemetry.schema';

@Injectable()
export class TelemetryService {
  constructor(private readonly devicesService: DevicesService) {}

  async saveTelemetry(payload: TelemetryPayloadDto): Promise<void> {
    await this.devicesService.recordTelemetry(payload);
  }
}
