import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppError, badRequest, conflict, forbidden, notFound, unauthorized, validationError } from '../../src/common/errors/app-error';
import { errorHandler, notFoundHandler } from '../../src/common/middleware/error-handler';
import { validate, validated } from '../../src/common/middleware/validate';
import { imageUrl } from '../../src/common/utils/cloudinary';
import { env } from '../../src/config/env';
import { fakeReq, fakeRes, thrown } from './fakes';

describe('AppError y sus atajos', () => {
  it.each([
    [badRequest('x'), 400, 'BAD_REQUEST'],
    [unauthorized(), 401, 'UNAUTHORIZED'],
    [forbidden(), 403, 'FORBIDDEN'],
    [notFound(), 404, 'NOT_FOUND'],
    [conflict('x'), 409, 'CONFLICT'],
    [validationError([]), 422, 'VALIDATION_ERROR'],
  ])('%#: status y código estables', (err, status, code) => {
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(status);
    expect(err.code).toBe(code);
  });

  it('conserva mensaje y detalles', () => {
    const e = badRequest('mal', { campo: 'x' });
    expect(e.message).toBe('mal');
    expect(e.details).toEqual({ campo: 'x' });
  });
});

describe('errorHandler', () => {
  const llamar = (err: unknown) => {
    const res = fakeRes();
    errorHandler(err, fakeReq(), res, vi.fn());
    return res;
  };
  afterEach(() => {
    (env as { isProd: boolean }).isProd = false;
  });

  it('AppError → su status con el formato { error: { code, message, details } }', () => {
    const res = llamar(notFound('No está'));
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'No está', details: undefined } });
  });

  it('JSON mal formado → 400 BAD_JSON', () => {
    const res = llamar(Object.assign(new Error('x'), { type: 'entity.parse.failed' }));
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe('BAD_JSON');
  });

  it('cuerpo demasiado grande → 413', () => {
    const res = llamar(Object.assign(new Error('x'), { type: 'entity.too.large' }));
    expect(res.statusCode).toBe(413);
  });

  it('error desconocido → 500; fuera de producción muestra el mensaje', () => {
    const res = llamar(new Error('detalle interno'));
    expect(res.statusCode).toBe(500);
    expect((res.body as { error: { message: string } }).error.message).toBe('detalle interno');
  });

  it('error desconocido en producción NO filtra detalles internos', () => {
    (env as { isProd: boolean }).isProd = true;
    const res = llamar(new Error('SELECT * FROM secretos falló'));
    expect(JSON.stringify(res.body)).not.toContain('secretos');
    expect((res.body as { error: { message: string } }).error.message).toBe('Ocurrió un error interno');
  });

  it('registra el error no controlado con el logger de la petición', () => {
    const log = { error: vi.fn() };
    errorHandler(new Error('boom'), fakeReq({ log } as never), fakeRes(), vi.fn());
    expect(log.error).toHaveBeenCalledOnce();
  });

  it('notFoundHandler nombra método y ruta', () => {
    const res = fakeRes();
    notFoundHandler(fakeReq({ method: 'POST', path: '/nada' }), res, vi.fn());
    expect(res.statusCode).toBe(404);
    expect((res.body as { error: { message: string } }).error.message).toContain('POST /nada');
  });
});

describe('validate / validated', () => {
  const schema = z.object({ n: z.coerce.number().int(), nombre: z.string().trim() });

  it('guarda lo validado y transformado en res.locals y llama a next', () => {
    const res = fakeRes();
    const next = vi.fn();
    validate(schema)(fakeReq({ body: { n: '5', nombre: '  Ana ' } }), res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(validated(res, 'body')).toEqual({ n: 5, nombre: 'Ana' });
  });

  it('valida otras fuentes (query/params) sin pisar las anteriores', () => {
    const res = fakeRes();
    validate(schema)(fakeReq({ body: { n: 1, nombre: 'a' } }), res, vi.fn());
    validate(z.object({ page: z.coerce.number() }), 'query')(fakeReq({ query: { page: '3' } as never }), res, vi.fn());
    expect(validated(res, 'query')).toEqual({ page: 3 });
    expect(validated(res, 'body')).toEqual({ n: 1, nombre: 'a' });
  });

  it('si es inválido lanza 422 con campo y mensaje en español, y no llama a next', () => {
    const next = vi.fn();
    const err = thrown(() => validate(schema)(fakeReq({ body: { n: 'abc' } }), fakeRes(), next)) as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(422);
    expect((err.details as { campo: string }[]).map((d) => d.campo).sort()).toEqual(['n', 'nombre']);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('imageUrl (Cloudinary)', () => {
  it('arma la URL con formato y calidad automáticos', () => {
    expect(imageUrl('proyectos/cocina/1')).toBe('https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto/proyectos/cocina/1');
  });
  it('agrega el ancho cuando se pide', () => {
    expect(imageUrl('a/b', { width: 800 })).toContain('/f_auto,q_auto,w_800/a/b');
  });
  it('los ids de datos de prueba (demo/…) no tienen URL', () => {
    expect(imageUrl('demo/cocina-1')).toBeNull();
  });
  it('sin CLOUDINARY_CLOUD_NAME devuelve null', () => {
    const previo = env.CLOUDINARY_CLOUD_NAME;
    (env as { CLOUDINARY_CLOUD_NAME?: string }).CLOUDINARY_CLOUD_NAME = undefined;
    try {
      expect(imageUrl('a/b')).toBeNull();
    } finally {
      (env as { CLOUDINARY_CLOUD_NAME?: string }).CLOUDINARY_CLOUD_NAME = previo;
    }
  });
});
