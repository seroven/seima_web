import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env';

// Límites por IP. Con TRUST_PROXY=true (Render) se usa la IP real del cliente.
const crear = (windowMs: number, limit: number, mensaje: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: mensaje } });
    },
  });

/** Evita que alguien llene la base con cotizaciones basura. */
export const quotesLimiter = () =>
  crear(60 * 60 * 1000, env.RATE_LIMIT_QUOTES_PER_HOUR, 'Demasiadas solicitudes. Intenta de nuevo en un rato.');

/** Cada cotización pide una firma para subir sus fotos: se limita para que nadie use nuestro Cloudinary como almacenamiento gratis. */
export const uploadsLimiter = () =>
  crear(60 * 60 * 1000, env.RATE_LIMIT_UPLOADS_PER_HOUR, 'Demasiadas subidas de fotos. Intenta de nuevo en un rato.');

/** Las visitas de la web: una persona navegando manda pocas por minuto; esto frena a quien quiera llenar la base. */
export const analyticsLimiter = () => crear(60 * 1000, env.RATE_LIMIT_ANALYTICS_PER_MIN, 'Demasiadas visitas seguidas.');

/** Frena la fuerza bruta contra el login del panel. */
export const loginLimiter = () =>
  crear(15 * 60 * 1000, env.RATE_LIMIT_LOGIN_PER_15MIN, 'Demasiados intentos. Espera unos minutos.');
