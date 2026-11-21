import type { Request, Response } from 'express';
import { unauthorized } from '../../common/errors/app-error';
import { validated } from '../../common/middleware/validate';
import type { LoginInput, PasswordInput, RefreshInput } from './auth.schemas';
import type { AuthService } from './auth.service';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  login = async (_req: Request, res: Response) => {
    const { usuario, password, dispositivo } = validated<LoginInput>(res, 'body');
    res.json({ data: await this.service.login(usuario, password, dispositivo) });
  };

  refresh = async (_req: Request, res: Response) => {
    const { refreshToken } = validated<RefreshInput>(res, 'body');
    res.json({ data: await this.service.refresh(refreshToken) });
  };

  logout = async (_req: Request, res: Response) => {
    const { refreshToken } = validated<RefreshInput>(res, 'body');
    await this.service.logout(refreshToken);
    res.status(204).end();
  };

  changePassword = async (req: Request, res: Response) => {
    if (!req.auth) throw unauthorized();
    const { passwordActual, passwordNueva } = validated<PasswordInput>(res, 'body');
    await this.service.changePassword(req.auth.userId, passwordActual, passwordNueva);
    res.status(204).end();
  };

  me = async (req: Request, res: Response) => {
    if (!req.auth) throw unauthorized();
    res.json({ data: await this.service.me(req.auth.userId) });
  };
}
