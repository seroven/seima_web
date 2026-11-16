import type { Request, Response } from 'express';
import { unauthorized } from '../../common/errors/app-error';
import { validated } from '../../common/middleware/validate';
import type { LoginInput } from './auth.schemas';
import type { AuthService } from './auth.service';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  login = async (_req: Request, res: Response) => {
    const { email, password } = validated<LoginInput>(res, 'body');
    res.json({ data: await this.service.login(email, password) });
  };

  me = async (req: Request, res: Response) => {
    if (!req.auth) throw unauthorized();
    res.json({ data: await this.service.me(req.auth.userId) });
  };
}
