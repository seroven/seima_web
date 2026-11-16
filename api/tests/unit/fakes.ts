// Dobles de prueba compartidos por las pruebas unitarias (sin base de datos ni Express real).
import type { Request, Response } from 'express';
import { vi } from 'vitest';

/** Respuesta de Express mínima: registra status y json. */
export function fakeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    locals: {} as Record<string, unknown>,
    status: vi.fn(function (this: typeof res, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: typeof res, body: unknown) {
      this.body = body;
      return this;
    }),
  };
  return res as typeof res & Response;
}

export const fakeReq = (parts: Partial<Request> & Record<string, unknown> = {}) =>
  ({ method: 'GET', path: '/x', headers: {}, body: {}, query: {}, params: {}, ...parts }) as unknown as Request;

/** Captura el error que lanza una función síncrona. */
export function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

/** Captura el error de una promesa rechazada. */
export async function rejected(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (e) {
    return e;
  }
  return undefined;
}
