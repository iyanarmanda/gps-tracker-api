import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule as ThrottlerBaseModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerBaseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'login',
          ttl: Number(configService.get('THROTTLE_TTL') ?? 60_000),
          limit: Number(configService.get('THROTTLE_LIMIT') ?? 5),
        },
      ],
    }),
  ],
  exports: [ThrottlerBaseModule],
})
export class ThrottlerModule {}
