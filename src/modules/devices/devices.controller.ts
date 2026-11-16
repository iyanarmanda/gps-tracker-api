import { Body, Controller, Get, Param, Patch, Sse } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { SendCommandDto } from './schemas/send-command.schema';

import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async findAll() {
    return this.devicesService.findAll();
  }

  @Sse('stream')
  streamDevices(): Observable<MessageEvent> {
    return this.devicesService.getDeviceStream();
  }

  @Patch(':espId/command')
  async sendCommand(
    @Param('espId') espId: string,
    @Body() dto: SendCommandDto,
  ) {
    return this.devicesService.sendCommand(espId, dto);
  }
}
