import { z } from 'zod';

export const sendCommandSchema = z.object({
  active: z.boolean(),
  interval: z.number().int().min(1).max(3600).optional(),
});

export type SendCommandSchema = z.infer<typeof sendCommandSchema>;

