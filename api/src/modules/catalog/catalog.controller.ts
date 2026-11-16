import type { Request, Response } from 'express';
import type { CatalogService } from './catalog.service';

export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  quoteForm = async (_req: Request, res: Response) => {
    res.json({ data: await this.service.quoteForm() });
  };
}
