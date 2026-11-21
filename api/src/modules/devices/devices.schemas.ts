import { z } from 'zod';

export const deviceTokenSchema = z.object({
  token: z.string().trim().min(10).max(4096),
});

export const deviceTokenParamsSchema = z.object({
  token: z.string().trim().min(10).max(4096),
});
