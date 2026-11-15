import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MQTT_CLIENT } from './mqtt.constant';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: MQTT_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.MQTT,
          options: {
            url: configService.getOrThrow<string>('MQTT_URL'),
            username: configService.getOrThrow<string>('MQTT_USER'),
            password: configService.getOrThrow<string>('MQTT_PASSWORD'),
            serializer: {
              serialize: (packet: { data: unknown }): string =>
                typeof packet.data === 'string'
                  ? packet.data
                  : JSON.stringify(packet.data),
            },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MqttModule {}
