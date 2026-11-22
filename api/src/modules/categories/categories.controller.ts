import type { Request, Response } from 'express';
import { validated } from '../../common/middleware/validate';
import type { ReorderInput } from '../../common/schemas';
import type { CategoriesPanelService } from './categories-panel.service';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.schemas';
import type { CategoriesService } from './categories.service';

/** Capa HTTP: traduce la petición a una llamada al servicio y la respuesta a JSON. Sin lógica de negocio. */
export class CategoriesController {
  constructor(
    private readonly service: CategoriesService,
    private readonly panel: CategoriesPanelService,
  ) {}

  list = async (_req: Request, res: Response) => {
    res.json({ data: await this.service.list() });
  };

  // ---- App de Luis ----

  gestion = async (_req: Request, res: Response) => {
    res.json({ data: await this.panel.list() });
  };

  create = async (_req: Request, res: Response) => {
    res.status(201).json({ data: await this.panel.create(validated<CreateCategoryInput>(res, 'body')) });
  };

  update = async (_req: Request, res: Response) => {
    const { id } = validated<{ id: string }>(res, 'params');
    res.json({ data: await this.panel.update(id, validated<UpdateCategoryInput>(res, 'body')) });
  };

  reorder = async (_req: Request, res: Response) => {
    res.json({ data: await this.panel.reorder(validated<ReorderInput>(res, 'body').ids) });
  };
}
