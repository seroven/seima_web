import { randomUUID } from 'node:crypto';
import type { DataSource, Repository } from 'typeorm';
import { RefreshToken } from './refresh-token.entity';

export interface NuevoRefresh {
  tokenHash: string;
  userId: string;
  familia?: string;
  dispositivo: string | null;
  vence: Date;
}

/** Único lugar que habla con la base para las sesiones largas. */
export class RefreshTokensRepository {
  private readonly repo: Repository<RefreshToken>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(RefreshToken);
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { tokenHash } });
  }

  async insert(data: NuevoRefresh): Promise<RefreshToken> {
    return this.repo.save(
      this.repo.create({
        tokenHash: data.tokenHash,
        userId: data.userId,
        familia: data.familia ?? randomUUID(),
        dispositivo: data.dispositivo,
        vence: data.vence,
        revocado: false,
      }),
    );
  }

  /** Marca el token como usado solo si seguía vigente. false = alguien ya lo rotó. */
  async revokeIfActive(id: string): Promise<boolean> {
    const res = await this.repo.update({ id, revocado: false }, { revocado: true });
    return (res.affected ?? 0) > 0;
  }

  async revokeById(id: string): Promise<void> {
    await this.repo.update(id, { revocado: true });
  }

  async revokeFamily(familia: string): Promise<void> {
    await this.repo.update({ familia }, { revocado: true });
  }

  async revokeUser(userId: string): Promise<void> {
    await this.repo.update({ userId }, { revocado: true });
  }
}
