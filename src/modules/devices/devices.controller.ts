import { Body, Controller, Param, Patch } from '@nestjs/common';
import { DevicesService } from './devices.service';

import type { SendCommandDto } from './schemas/send-command.schema';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Patch(':espId/command')
  async sendCommand(
    @Param('espId') espId: string,
    @Body() dto: SendCommandDto,
  ) {
    return this.devicesService.sendCommand(espId, dto);
  }
}
