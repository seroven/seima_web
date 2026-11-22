import type { Request, Response } from 'express';
import { validated } from '../../common/middleware/validate';
import type { AnalyticsService } from './analytics.service';
import type { HitInput, ResumenQuery } from './analytics.schemas';

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  /** La web avisa de una visita. Siempre 204: nunca debe estorbar a quien navega, ni decirle si se midió o no. */
  hit = async (req: Request, res: Response) => {
    const hit = validated<HitInput>(res, 'body');
    await this.service.registrar(hit, { ip: req.ip ?? '', ua: req.get('user-agent') });
    res.status(204).end();
  };

  resumen = async (_req: Request, res: Response) => {
    const { periodo } = validated<ResumenQuery>(res, 'query');
    res.json({ data: await this.service.resumen(periodo) });
  };
}
