import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const sendCommandSchema = z.object({
  active: z.boolean(),
  interval: z
    .union([z.literal(2), z.literal(5), z.literal(10), z.literal(30)])
    .optional(),
});

export class SendCommandDto extends createZodDto(sendCommandSchema) {}
