import type { DataSource, Repository } from 'typeorm';
import { DeviceToken } from './device-token.entity';

/** Único lugar que habla con la base para los celulares que reciben avisos. */
export class DevicesRepository {
  private readonly repo: Repository<DeviceToken>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(DeviceToken);
  }

  findByToken(token: string): Promise<DeviceToken | null> {
    return this.repo.findOne({ where: { token } });
  }

  save(data: Partial<DeviceToken> & Pick<DeviceToken, 'userId' | 'token'>): Promise<DeviceToken> {
    return this.repo.save(this.repo.create(data));
  }

  async touch(id: string, userId: string): Promise<void> {
    await this.repo.update(id, { userId });
  }

  async remove(token: string, userId: string): Promise<boolean> {
    const res = await this.repo.delete({ token, userId });
    return (res.affected ?? 0) > 0;
  }

  async tokens(): Promise<string[]> {
    const filas = await this.repo.find({ select: { id: true, token: true } });
    return filas.map((f) => f.token);
  }
}
