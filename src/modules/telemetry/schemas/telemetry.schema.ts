import { z } from 'zod';

export const telemetryPayloadSchema = z.object({
  device_id: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0),
  satellites: z.number().int().min(0),
  timestamp: z.number().int().positive().optional(),
});

export type TelemetryPayloadSchema = z.infer<typeof telemetryPayloadSchema>;
