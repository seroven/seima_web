import type { Request, Response } from 'express';
import type { CategoriesService } from './categories.service';

/** Capa HTTP: traduce la petición a una llamada al servicio y la respuesta a JSON. Sin lógica de negocio. */
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  list = async (_req: Request, res: Response) => {
    res.json({ data: await this.service.list() });
  };
}
