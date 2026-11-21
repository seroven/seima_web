import type { DevicesRepository } from './devices.repository';

export class DevicesService {
  constructor(private readonly repository: DevicesRepository) {}

  /** Registra el celular. Si el token ya existía (otro usuario o el mismo), queda con este usuario. */
  async register(userId: string, token: string): Promise<{ token: string }> {
    const existente = await this.repository.findByToken(token);
    if (existente) await this.repository.touch(existente.id, userId);
    else await this.repository.save({ userId, token });
    return { token };
  }

  async remove(userId: string, token: string): Promise<void> {
    await this.repository.remove(decodeURIComponent(token), userId);
  }

  tokens(): Promise<string[]> {
    return this.repository.tokens();
  }
}
