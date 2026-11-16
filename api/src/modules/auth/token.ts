// Emisión y verificación del JWT del panel (HS256). El secreto vive solo en el .env.
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { unauthorized } from '../../common/errors/app-error';
import type { Rol } from './admin-user.entity';

export interface AccessTokenClaims {
  userId: string;
  rol: Rol;
}

export function signAccessToken(claims: AccessTokenClaims): { token: string; expiresIn: number } {
  const token = jwt.sign({ rol: claims.rol }, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: claims.userId,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
  const { exp, iat } = jwt.decode(token) as JwtPayload;
  return { token, expiresIn: (exp ?? 0) - (iat ?? 0) };
}

/** Verifica firma, vencimiento, emisor y audiencia. Cualquier fallo es un 401 genérico (no se filtra el motivo). */
export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const p = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE }) as JwtPayload;
    if (!p.sub || p.rol !== 'admin') throw new Error('claims inválidos');
    return { userId: p.sub, rol: p.rol };
  } catch {
    throw unauthorized();
  }
}
