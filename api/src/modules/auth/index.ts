import type { DataSource } from 'typeorm';
import { AdminUsersRepository } from './admin-users.repository';
import { AuthController } from './auth.controller';
import { createAuthenticate } from './auth.middleware';
import { authRoutes } from './auth.routes';
import { AuthService } from './auth.service';
import { RefreshTokensRepository } from './refresh-tokens.repository';

export function buildAuthModule(dataSource: DataSource) {
  const repository = new AdminUsersRepository(dataSource);
  const service = new AuthService(repository, new RefreshTokensRepository(dataSource));
  /** Middleware para proteger las rutas del panel: `router.get('/x', authenticate, requireRole('admin'), …)` */
  const authenticate = createAuthenticate(service);
  const router = authRoutes(new AuthController(service), authenticate);
  return { repository, service, authenticate, router };
}
