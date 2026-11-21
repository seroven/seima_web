import { z } from 'zod';

const usuario = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9._-]+$/, 'Usuario inválido');

export const loginSchema = z.object({
  usuario,
  password: z.string().min(1).max(200),
  dispositivo: z.string().trim().min(1).max(120).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(500),
});

export const passwordSchema = z.object({
  passwordActual: z.string().min(1).max(200),
  passwordNueva: z.string().min(6).max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
