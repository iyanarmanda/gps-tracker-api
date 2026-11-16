import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Subject, lastValueFrom } from 'rxjs';
import { MQTT_CLIENT } from '../../config/mqtt/mqtt.constant';
import { DevicesRepository } from './devices.repository';

import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { SendCommandDto } from './schemas/send-command.schema';
import type { TelemetryPayloadDto } from '../telemetry/schemas/telemetry.schema';
import type { DeviceCommandPayload } from './interfaces/device-command.interface';
import type { DeviceStatusStreamData } from './interfaces/device-status-stream.interface';
import type { DeviceTelemetryStreamData } from './interfaces/device-telemetry-stream.interface';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);
  private readonly deviceEvents$ = new Subject<MessageEvent>();

  constructor(
    private readonly devicesRepository: DevicesRepository,

    @Inject(MQTT_CLIENT)
    private readonly mqttClient: ClientProxy,
  ) {}

  getDeviceStream(): Observable<MessageEvent> {
    return this.deviceEvents$.asObservable();
  }

  async findAll() {
    const allDevices = await this.devicesRepository.findAll();
    const espIds = allDevices.map((device) => device.espId);
    const locationMap =
      await this.devicesRepository.getLocationsByEspIds(espIds);

    return allDevices.map((device) => ({
      ...device,
      location: locationMap.get(device.espId) ?? null,
    }));
  }

  async recordTelemetry(payload: TelemetryPayloadDto): Promise<void> {
    const updatedAt = payload.timestamp ?? Math.floor(Date.now() / 1000);

    await this.devicesRepository.updateTelemetryLocation({
      espId: payload.device_id,
      lat: payload.lat,
      lng: payload.lng,
      speed: payload.speed,
      satellites: payload.satellites,
      updatedAt,
    });

    const streamData: DeviceTelemetryStreamData = {
      espId: payload.device_id,
      lat: payload.lat,
      lng: payload.lng,
      speed: payload.speed,
      satellites: payload.satellites,
      active: true,
      updatedAt,
    };

    this.deviceEvents$.next({
      type: 'telemetry',
      data: streamData,
    });

    this.logger.debug(
      `Telemetry updated [${payload.device_id}] -> (${String(payload.lat)}, ${String(payload.lng)})`,
    );
  }

  async sendCommand(espId: string, dto: SendCommandDto) {
    const existing = await this.devicesRepository.findByEspId(espId);

    if (!existing) {
      throw new NotFoundException(`Device with esp_id "${espId}" not found`);
    }

    const nextInterval = dto.interval ?? existing.interval;
    const now = new Date();
    const unixTimestamp = Math.floor(now.getTime() / 1000);

    const updatedDevice = await this.devicesRepository.updateCommandState(
      espId,
      {
        isActive: dto.active,
        interval: nextInterval,
        activatedAt: dto.active ? (existing.activatedAt ?? now) : null,
      },
    );

    await this.devicesRepository.syncRedisState(
      espId,
      dto.active,
      unixTimestamp,
    );

    const topic = `tracker/devices/${espId}/command`;
    const commandPayload: DeviceCommandPayload = {
      device_id: espId,
      active: dto.active,
      interval_seconds: nextInterval,
      timestamp: unixTimestamp,
    };

    await lastValueFrom(this.mqttClient.emit(topic, commandPayload));

    const statusData: DeviceStatusStreamData = {
      espId,
      active: dto.active,
      interval: nextInterval,
      updatedAt: unixTimestamp,
    };

    this.deviceEvents$.next({
      type: 'status',
      data: statusData,
    });

    this.logger.log(
      `Published command to "${topic}": active=${String(dto.active)}, interval=${String(nextInterval)}s`,
    );

    return {
      device: updatedDevice,
      published: {
        topic,
        payload: commandPayload,
      },
    };
  }
}
