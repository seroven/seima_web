import pino from 'pino';
import { env } from '../config/env';

// Logs estructurados (JSON). Nunca se registran contraseñas ni tokens.
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash', '*.token'], censor: '[oculto]' },
});
