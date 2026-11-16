import type { DataSource, DeepPartial, Repository } from 'typeorm';
import { AdminUser } from './admin-user.entity';

/** Único lugar que habla con la base para usuarios del panel. */
export class AdminUsersRepository {
  private readonly repo: Repository<AdminUser>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(AdminUser);
  }

  findByEmail(email: string): Promise<AdminUser | null> {
    return this.repo.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  findById(id: string): Promise<AdminUser | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: DeepPartial<AdminUser>): Promise<AdminUser> {
    return this.repo.save(this.repo.create({ ...data, email: String(data.email).trim().toLowerCase() }));
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.repo.update(id, { ultimoAcceso: new Date() });
  }
}
