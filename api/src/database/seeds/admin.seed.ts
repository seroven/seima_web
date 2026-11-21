import type { DataSource } from 'typeorm';
import { env } from '../../config/env';
import { AdminUsersRepository } from '../../modules/auth/admin-users.repository';
import { AuthService } from '../../modules/auth/auth.service';

/** Usuario con el que entra Luis. En dev, qa y test la clave es 123456; en producción sale de ADMIN_PASSWORD. */
export const ADMIN_USUARIO = 'luis';
const CLAVE_DE_PRUEBA = '123456';

export async function seedAdmin(ds: DataSource): Promise<'creado' | 'existente'> {
  const password = env.APP_ENV === 'pd' ? env.ADMIN_PASSWORD : CLAVE_DE_PRUEBA;
  if (!password) throw new Error('En producción define ADMIN_PASSWORD (mínimo 10 caracteres) para crear al administrador.');
  if (env.APP_ENV === 'pd' && password.length < 10) throw new Error('ADMIN_PASSWORD debe tener al menos 10 caracteres.');

  const repo = new AdminUsersRepository(ds);
  if (await repo.findByUsuario(ADMIN_USUARIO)) return 'existente';
  await new AuthService(repo, null as never).createAdmin({
    usuario: ADMIN_USUARIO,
    email: env.ADMIN_EMAIL ?? null,
    password,
    nombre: env.ADMIN_NAME,
  });
  return 'creado';
}
