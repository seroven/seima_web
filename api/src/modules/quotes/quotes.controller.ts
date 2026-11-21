import type { Request, Response } from 'express';
import { validated } from '../../common/middleware/validate';
import type { EstadoCotizacion } from './quote.constants';
import type { CreateQuoteInput, ListQuotesQuery } from './quotes.schemas';
import type { QuotesService } from './quotes.service';

export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  create = async (_req: Request, res: Response) => {
    const creada = await this.service.create(validated<CreateQuoteInput>(res, 'body'));
    res.status(201).json({ data: creada });
  };

  list = async (_req: Request, res: Response) => {
    res.json(await this.service.list(validated<ListQuotesQuery>(res, 'query')));
  };

  get = async (_req: Request, res: Response) => {
    const { id } = validated<{ id: string }>(res, 'params');
    res.json({ data: await this.service.get(id) });
  };

  setEstado = async (_req: Request, res: Response) => {
    const { id } = validated<{ id: string }>(res, 'params');
    const { estado } = validated<{ estado: EstadoCotizacion }>(res, 'body');
    res.json({ data: await this.service.setEstado(id, estado) });
  };
}
