import type { Request, Response } from 'express';
import { unauthorized } from '../../common/errors/app-error';
import { validated } from '../../common/middleware/validate';
import type { DevicesService } from './devices.service';

export class DevicesController {
  constructor(private readonly service: DevicesService) {}

  register = async (req: Request, res: Response) => {
    if (!req.auth) throw unauthorized();
    const { token } = validated<{ token: string }>(res, 'body');
    res.status(201).json({ data: await this.service.register(req.auth.userId, token) });
  };

  remove = async (req: Request, res: Response) => {
    if (!req.auth) throw unauthorized();
    const { token } = validated<{ token: string }>(res, 'params');
    await this.service.remove(req.auth.userId, token);
    res.status(204).end();
  };
}
