import { createHash, randomBytes } from 'node:crypto';

export const hashToken = (raw: string) => createHash('sha256').update(raw).digest('hex');
export const nuevoToken = () => randomBytes(32).toString('base64url');

/** `60d`, `12h` o `30m` → milisegundos. El entorno ya validó el formato. */
export function plazoEnMs(valor: string): number {
  const m = /^(\d+)([dhm])$/.exec(valor)!;
  const n = Number(m[1]);
  return n * (m[2] === 'd' ? 86_400_000 : m[2] === 'h' ? 3_600_000 : 60_000);
}
