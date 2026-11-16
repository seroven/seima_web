import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env';
import { AppDataSource } from '../../src/database/data-source';
import { AdminUser } from '../../src/modules/auth/admin-user.entity';
import { API, agent, useDatabase } from './helpers';

useDatabase();

const credenciales = { email: env.ADMIN_EMAIL!, password: env.ADMIN_PASSWORD! };
const login = () => agent().post(`${API}/auth/login`).send(credenciales);

describe('POST /auth/login', () => {
  it('entrega un JWT y los datos del usuario (sin hash ni contraseña)', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    const { token, tokenType, expiresIn, usuario } = res.body.data;
    expect(tokenType).toBe('Bearer');
    expect(expiresIn).toBeGreaterThan(0);
    expect(usuario).toEqual({ id: expect.any(String), email: credenciales.email, nombre: expect.any(String), rol: 'admin' });
    expect(JSON.stringify(res.body)).not.toMatch(/hash|password/i);
    const claims = jwt.decode(token) as jwt.JwtPayload;
    expect(claims).toMatchObject({ sub: usuario.id, rol: 'admin', iss: env.JWT_ISSUER, aud: env.JWT_AUDIENCE });
  });

  it('el correo no distingue mayúsculas', async () => {
    const res = await agent().post(`${API}/auth/login`).send({ ...credenciales, email: credenciales.email.toUpperCase() });
    expect(res.status).toBe(200);
  });

  it('contraseña o correo incorrectos → el mismo 401 (no revela cuál falló)', async () => {
    const mal = await agent().post(`${API}/auth/login`).send({ ...credenciales, password: 'incorrecta' });
    const noExiste = await agent().post(`${API}/auth/login`).send({ email: 'nadie@seima.test', password: 'incorrecta' });
    expect(mal.status).toBe(401);
    expect(noExiste.status).toBe(401);
    expect(noExiste.body).toEqual(mal.body);
  });

  it('valida el cuerpo', async () => {
    const res = await agent().post(`${API}/auth/login`).send({ email: 'no-es-correo' });
    expect(res.status).toBe(422);
  });
});

describe('GET /auth/me (ruta protegida de ejemplo)', () => {
  it('sin token → 401', async () => {
    expect((await agent().get(`${API}/auth/me`)).status).toBe(401);
  });

  it('con token válido → 200', async () => {
    const { token } = (await login()).body.data;
    const res = await agent().get(`${API}/auth/me`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(credenciales.email);
  });

  it('token manipulado → 401', async () => {
    const { token } = (await login()).body.data;
    const res = await agent().get(`${API}/auth/me`).set('Authorization', `Bearer ${token}x`);
    expect(res.status).toBe(401);
  });

  it('token firmado con otro secreto → 401', async () => {
    const falso = jwt.sign({ rol: 'admin' }, 'otro-secreto-que-no-es-el-correcto-123456', { subject: 'x', issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE });
    expect((await agent().get(`${API}/auth/me`).set('Authorization', `Bearer ${falso}`)).status).toBe(401);
  });

  it('token vencido → 401', async () => {
    const { usuario } = (await login()).body.data;
    const vencido = jwt.sign({ rol: 'admin' }, env.JWT_SECRET, { subject: usuario.id, issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE, expiresIn: -10 });
    expect((await agent().get(`${API}/auth/me`).set('Authorization', `Bearer ${vencido}`)).status).toBe(401);
  });

  it('token con otra audiencia (no es del panel) → 401', async () => {
    const { usuario } = (await login()).body.data;
    const otro = jwt.sign({ rol: 'admin' }, env.JWT_SECRET, { subject: usuario.id, issuer: env.JWT_ISSUER, audience: 'otra-app' });
    expect((await agent().get(`${API}/auth/me`).set('Authorization', `Bearer ${otro}`)).status).toBe(401);
  });

  it('si desactivan al usuario, su token deja de servir al instante', async () => {
    const { token, usuario } = (await login()).body.data;
    const repo = AppDataSource.getRepository(AdminUser);
    await repo.update(usuario.id, { activo: false });
    try {
      expect((await agent().get(`${API}/auth/me`).set('Authorization', `Bearer ${token}`)).status).toBe(401);
      expect((await login()).status).toBe(401);
    } finally {
      await repo.update(usuario.id, { activo: true });
    }
  });
});
