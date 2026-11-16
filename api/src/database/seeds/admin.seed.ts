import type { DataSource } from 'typeorm';
import { env } from '../../config/env';
import { AdminUsersRepository } from '../../modules/auth/admin-users.repository';
import { AuthService } from '../../modules/auth/auth.service';

/** Crea el administrador inicial con ADMIN_EMAIL / ADMIN_PASSWORD del .env (si ya existe, no hace nada). */
export async function seedAdmin(ds: DataSource): Promise<'creado' | 'existente'> {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD (mín. 10 caracteres) en el .env para crear el administrador.');
  }
  const repo = new AdminUsersRepository(ds);
  if (await repo.findByEmail(env.ADMIN_EMAIL)) return 'existente';
  await new AuthService(repo).createAdmin({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, nombre: env.ADMIN_NAME });
  return 'creado';
}
