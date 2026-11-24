import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';
import { ENV_FILE_MAP } from './env.constant';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath:
        ENV_FILE_MAP[process.env.NODE_ENV ?? 'development'] ?? '.env',
      isGlobal: true,
      validate: (env) => {
        const schema = z.object({
          PORT: z.preprocess(
            (val) => (val ? Number(val) : undefined),
            z.number().default(3000),
          ),
          NODE_ENV: z
            .enum(['production', 'development', 'test'])
            .default('production'),

          CORS_ORIGIN: z.string(),

          SQLITE_URL: z.string(),

          REDIS_URL: z.string(),
          REDIS_HOST: z.string(),
          REDIS_PASSWORD: z.string(),
          REDIS_PORT: z.preprocess(
            (val) => (val ? Number(val) : undefined),
            z.number().default(6379),
          ),

          MQTT_URL: z.string(),
          MQTT_USER: z.string(),
          MQTT_PASSWORD: z.string(),
          MQTT_PORT: z.preprocess(
            (val) => (val ? Number(val) : undefined),
            z.number().default(1883),
          ),

          AUTH_USERNAME: z.string(),
          AUTH_PASSWORD_HASH: z.string(),
          AUTH_PEPPER: z.string(),

          JWT_SECRET: z.string(),
          COOKIE_DOMAIN: z.string(),

          THROTTLE_TTL: z.preprocess(
            (val) => (val ? Number(val) : undefined),
            z.number().default(60000),
          ),

          THROTTLE_LIMIT: z.preprocess(
            (val) => (val ? Number(val) : undefined),
            z.number().default(5),
          ),
        });
        return schema.parse(env);
      },
    }),
  ],
})
export class EnvModule {}
