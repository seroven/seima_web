import type { Request, Response } from 'express';
import { validated } from '../../common/middleware/validate';
import type { CreateQuoteInput } from './quotes.schemas';
import type { QuotesService } from './quotes.service';

export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  create = async (_req: Request, res: Response) => {
    const creada = await this.service.create(validated<CreateQuoteInput>(res, 'body'));
    res.status(201).json({ data: creada });
  };
}
