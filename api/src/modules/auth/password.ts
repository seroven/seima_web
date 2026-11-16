import bcrypt from 'bcryptjs';
import { env } from '../../config/env';

// bcryptjs (JavaScript puro): no requiere compilar nada en Windows ni en Render.
export const hashPassword = (plain: string) => bcrypt.hash(plain, env.BCRYPT_ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
