import { BadRequestException, Body, Controller, Param, Patch } from '@nestjs/common';
import { sendCommandSchema } from './schemas/send-command.schema';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Patch(':espId/command')
  async sendCommand(
    @Param('espId') espId: string,
    @Body() rawBody: unknown,
  ) {
    const parsed = sendCommandSchema.safeParse(rawBody);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Payload not valid',
        errors: parsed.error.issues,
      });
    }

    return this.devicesService.sendCommand(espId, parsed.data);
  }
}
