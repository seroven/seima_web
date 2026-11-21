import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/common/errors/app-error';
import { env } from '../../src/config/env';
import type { AdminUser } from '../../src/modules/auth/admin-user.entity';
import type { AdminUsersRepository } from '../../src/modules/auth/admin-users.repository';
import { createAuthenticate, requireRole } from '../../src/modules/auth/auth.middleware';
import { loginSchema } from '../../src/modules/auth/auth.schemas';
import { AuthService } from '../../src/modules/auth/auth.service';
import { hashPassword, verifyPassword } from '../../src/modules/auth/password';
import { signAccessToken, verifyAccessToken } from '../../src/modules/auth/token';
import { fakeReq, fakeRes, rejected, thrown } from './fakes';

const ID = '11111111-1111-1111-1111-111111111111';

describe('password', () => {
  it('el hash no es la contraseña, es distinto cada vez y se verifica', async () => {
    const a = await hashPassword('Clave-Segura-1');
    const b = await hashPassword('Clave-Segura-1');
    expect(a).not.toContain('Clave-Segura-1');
    expect(a).not.toBe(b);
    expect(await verifyPassword('Clave-Segura-1', a)).toBe(true);
    expect(await verifyPassword('otra', a)).toBe(false);
  });
});

describe('token JWT', () => {
  it('firma y verifica; expiresIn coincide con JWT_EXPIRES_IN (1h)', () => {
    const { token, expiresIn } = signAccessToken({ userId: ID, rol: 'admin' });
    expect(expiresIn).toBe(3600);
    expect(verifyAccessToken(token)).toEqual({ userId: ID, rol: 'admin' });
  });

  it('usa HS256 y lleva issuer y audience', () => {
    const { token } = signAccessToken({ userId: ID, rol: 'admin' });
    const dec = jwt.decode(token, { complete: true })!;
    expect(dec.header.alg).toBe('HS256');
    expect(dec.payload).toMatchObject({ sub: ID, iss: env.JWT_ISSUER, aud: env.JWT_AUDIENCE, rol: 'admin' });
  });

  const rechaza = (token: string) => {
    const e = thrown(() => verifyAccessToken(token)) as AppError;
    expect(e).toBeInstanceOf(AppError);
    expect(e.status).toBe(401);
  };

  it('rechaza: basura, manipulado, otro secreto, vencido, otra audiencia, otro emisor', () => {
    const { token } = signAccessToken({ userId: ID, rol: 'admin' });
    const base = { subject: ID, issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE };
    rechaza('no-es-un-token');
    rechaza(token + 'x');
    rechaza(jwt.sign({ rol: 'admin' }, 'otro-secreto-distinto-de-32-caracteres-xx', base));
    rechaza(jwt.sign({ rol: 'admin' }, env.JWT_SECRET, { ...base, expiresIn: -10 }));
    rechaza(jwt.sign({ rol: 'admin' }, env.JWT_SECRET, { ...base, audience: 'otra-app' }));
    rechaza(jwt.sign({ rol: 'admin' }, env.JWT_SECRET, { ...base, issuer: 'otro' }));
  });

  it('rechaza claims incompletos (sin sub o con rol desconocido)', () => {
    const base = { issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE };
    rechaza(jwt.sign({ rol: 'admin' }, env.JWT_SECRET, base)); // sin subject
    rechaza(jwt.sign({ rol: 'superdios' }, env.JWT_SECRET, { ...base, subject: ID }));
  });

  it('rechaza un token "alg: none"', () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    rechaza(`${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: ID, rol: 'admin', iss: env.JWT_ISSUER, aud: env.JWT_AUDIENCE })}.`);
  });
});

function usuario(parcial: Partial<AdminUser> = {}): AdminUser {
  return { id: ID, usuario: 'luis', email: 'luis@seima.pe', nombre: 'Luis', rol: 'admin', activo: true, passwordHash: '', ...parcial } as AdminUser;
}

function repoFalso(user: AdminUser | null) {
  return {
    findByUsuario: vi.fn().mockResolvedValue(user),
    findById: vi.fn().mockResolvedValue(user),
    touchLastLogin: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    create: vi.fn(async (d: Partial<AdminUser>) => usuario(d)),
  };
}

function sesionesFalsas() {
  const filas: { id: string; tokenHash: string; userId: string; familia: string; dispositivo: string | null; vence: Date; revocado: boolean }[] = [];
  return {
    filas,
    findByHash: vi.fn(async (tokenHash: string) => filas.find((f) => f.tokenHash === tokenHash) ?? null),
    insert: vi.fn(async (d: { tokenHash: string; userId: string; familia?: string; dispositivo: string | null; vence: Date }) => {
      const fila = { id: `r${filas.length + 1}`, revocado: false, familia: d.familia ?? 'fam', dispositivo: d.dispositivo, tokenHash: d.tokenHash, userId: d.userId, vence: d.vence };
      filas.push(fila);
      return fila;
    }),
    revokeIfActive: vi.fn(async (id: string) => {
      const fila = filas.find((f) => f.id === id && !f.revocado);
      if (!fila) return false;
      fila.revocado = true;
      return true;
    }),
    revokeById: vi.fn(async (id: string) => {
      const fila = filas.find((f) => f.id === id);
      if (fila) fila.revocado = true;
    }),
    revokeFamily: vi.fn(async (familia: string) => {
      for (const fila of filas) if (fila.familia === familia) fila.revocado = true;
    }),
    revokeUser: vi.fn(async () => {
      for (const fila of filas) fila.revocado = true;
    }),
  };
}

describe('AuthService', () => {
  let hash: string;
  beforeEach(async () => {
    hash = await hashPassword('Correcta-123');
  });
  const servicio = (repo: ReturnType<typeof repoFalso>, sesiones = sesionesFalsas()) =>
    new AuthService(repo as unknown as AdminUsersRepository, sesiones as never);

  it('login correcto: token, expiresIn, usuario sin hash, y registra el último acceso', async () => {
    const repo = repoFalso(usuario({ passwordHash: hash }));
    const r = await servicio(repo).login('luis', 'Correcta-123');
    expect(r.tokenType).toBe('Bearer');
    expect(r.expiresIn).toBe(3600);
    expect(r.refreshToken.length).toBeGreaterThan(20);
    expect(r.usuario).toEqual({ id: ID, usuario: 'luis', email: 'luis@seima.pe', nombre: 'Luis', rol: 'admin' });
    expect(JSON.stringify(r)).not.toContain(hash);
    expect(verifyAccessToken(r.token).userId).toBe(ID);
    expect(repo.touchLastLogin).toHaveBeenCalledWith(ID);
  });

  it.each([
    ['contraseña incorrecta', usuario({ passwordHash: '' }), 'mala'],
    ['usuario inexistente', null, 'Correcta-123'],
    ['usuario desactivado', usuario({ activo: false }), 'Correcta-123'],
  ])('login falla con 401 y el mismo mensaje: %s', async (_c, user, pass) => {
    const u = user && user.passwordHash === '' ? { ...user, passwordHash: hash } : user;
    const repo = repoFalso(u);
    const err = (await rejected(servicio(repo).login('luis', pass))) as AppError;
    expect(err.status).toBe(401);
    expect(err.message).toBe('Usuario o contraseña incorrectos');
    expect(repo.touchLastLogin).not.toHaveBeenCalled();
  });

  it('desactivado con contraseña correcta tampoco entra', async () => {
    const repo = repoFalso(usuario({ passwordHash: hash, activo: false }));
    expect(((await rejected(servicio(repo).login('luis', 'Correcta-123'))) as AppError).status).toBe(401);
  });

  it('authenticate devuelve al usuario; falla si no existe o está desactivado', async () => {
    const { token } = signAccessToken({ userId: ID, rol: 'admin' });
    expect((await servicio(repoFalso(usuario())).authenticate(token)).id).toBe(ID);
    expect(((await rejected(servicio(repoFalso(null)).authenticate(token))) as AppError).status).toBe(401);
    expect(((await rejected(servicio(repoFalso(usuario({ activo: false }))).authenticate(token))) as AppError).status).toBe(401);
    expect(((await rejected(servicio(repoFalso(usuario())).authenticate('basura'))) as AppError).status).toBe(401);
  });

  it('me devuelve el DTO; falla si el usuario ya no está activo', async () => {
    expect(await servicio(repoFalso(usuario())).me(ID)).toEqual({ id: ID, usuario: 'luis', email: 'luis@seima.pe', nombre: 'Luis', rol: 'admin' });
    expect(((await rejected(servicio(repoFalso(usuario({ activo: false }))).me(ID))) as AppError).status).toBe(401);
  });

  it('createAdmin guarda un hash (nunca la contraseña) con rol admin', async () => {
    const repo = repoFalso(null);
    await servicio(repo).createAdmin({ usuario: 'luis', email: 'a@b.pe', password: 'Secreta-12345', nombre: 'A' });
    const guardado = repo.create.mock.calls[0][0];
    expect(guardado.rol).toBe('admin');
    expect(guardado.passwordHash).not.toBe('Secreta-12345');
    expect(await verifyPassword('Secreta-12345', guardado.passwordHash!)).toBe(true);
  });
});

describe('middleware authenticate / requireRole', () => {
  const authFalso = (user: AdminUser | Error) =>
    ({ authenticate: vi.fn(async () => (user instanceof Error ? Promise.reject(user) : user)) }) as unknown as AuthService;

  it('con "Bearer <token>" deja pasar y deja req.auth', async () => {
    const req = fakeReq({ headers: { authorization: 'Bearer abc' } });
    const next = vi.fn();
    await createAuthenticate(authFalso(usuario()))(req, fakeRes(), next);
    expect(req.auth).toEqual({ userId: ID, rol: 'admin' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('el esquema "bearer" no distingue mayúsculas', async () => {
    const next = vi.fn();
    await createAuthenticate(authFalso(usuario()))(fakeReq({ headers: { authorization: 'bearer abc' } }), fakeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it.each([[undefined], ['abc'], ['Basic abc'], ['Bearer'], ['Bearer ']])('sin token válido en la cabecera (%j) → 401 y sin llamar al servicio', async (header) => {
    const auth = authFalso(usuario());
    const e = (await rejected(createAuthenticate(auth)(fakeReq({ headers: header ? { authorization: header } : {} }), fakeRes(), vi.fn()) as Promise<unknown>)) as AppError;
    expect(e.status).toBe(401);
    expect(auth.authenticate).not.toHaveBeenCalled();
  });

  it('si el servicio rechaza el token, propaga el 401 y no llama a next', async () => {
    const next = vi.fn();
    const p = createAuthenticate(authFalso(new AppError(401, 'UNAUTHORIZED', 'x')))(fakeReq({ headers: { authorization: 'Bearer t' } }), fakeRes(), next) as Promise<unknown>;
    expect(((await rejected(p)) as AppError).status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('requireRole: permite el rol, 403 con otro, 401 sin autenticar', () => {
    const next = vi.fn();
    requireRole('admin')(fakeReq({ auth: { userId: ID, rol: 'admin' } } as never), fakeRes(), next);
    expect(next).toHaveBeenCalledOnce();
    expect((thrown(() => requireRole('admin')(fakeReq({ auth: { userId: ID, rol: 'otro' } } as never), fakeRes(), vi.fn())) as AppError).status).toBe(403);
    expect((thrown(() => requireRole('admin')(fakeReq(), fakeRes(), vi.fn())) as AppError).status).toBe(401);
  });
});

describe('loginSchema', () => {
  it('normaliza el usuario (trim + minúsculas)', () => {
    expect(loginSchema.parse({ usuario: '  Luis ', password: 'x' }).usuario).toBe('luis');
  });
  it.each([[{ usuario: 'Lu', password: 'x' }], [{ usuario: 'luis', password: '' }], [{ usuario: 'luis' }], [{ password: 'x' }], [{ usuario: 'luis', password: 'x'.repeat(201) }], [{ usuario: 'lu is', password: 'x' }]])('rechaza %j', (v) => {
    expect(loginSchema.safeParse(v).success).toBe(false);
  });
});

describe('refresh con rotación', () => {
  it('un token ya usado revoca toda la familia', async () => {
    const hash = await hashPassword('Correcta-123');
    const repo = repoFalso(usuario({ passwordHash: hash }));
    const sesiones = sesionesFalsas();
    const svc = new AuthService(repo as unknown as AdminUsersRepository, sesiones as never);
    const primera = await svc.login('luis', 'Correcta-123');
    const segunda = await svc.refresh(primera.refreshToken);
    expect(segunda.refreshToken).not.toBe(primera.refreshToken);
    const reuso = (await rejected(svc.refresh(primera.refreshToken))) as AppError;
    expect(reuso.status).toBe(401);
    const seguida = (await rejected(svc.refresh(segunda.refreshToken))) as AppError;
    expect(seguida.status).toBe(401);
  });
});
