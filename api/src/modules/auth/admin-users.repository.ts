import type { DataSource, DeepPartial, Repository } from 'typeorm';
import { AdminUser } from './admin-user.entity';

/** Único lugar que habla con la base para usuarios del panel. */
export class AdminUsersRepository {
  private readonly repo: Repository<AdminUser>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(AdminUser);
  }

  findByUsuario(usuario: string): Promise<AdminUser | null> {
    return this.repo.findOne({ where: { usuario: usuario.trim().toLowerCase() } });
  }

  findByEmail(email: string): Promise<AdminUser | null> {
    return this.repo.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  findById(id: string): Promise<AdminUser | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: DeepPartial<AdminUser>): Promise<AdminUser> {
    const email = data.email ? String(data.email).trim().toLowerCase() : null;
    const usuario = String(data.usuario).trim().toLowerCase();
    return this.repo.save(this.repo.create({ ...data, email, usuario }));
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.repo.update(id, { passwordHash });
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.repo.update(id, { ultimoAcceso: new Date() });
  }
}
