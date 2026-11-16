import type { Request, Response } from 'express';
import { validated } from '../../common/middleware/validate';
import type { ListProjectsQuery } from './projects.schemas';
import type { ProjectsService } from './projects.service';

export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  list = async (_req: Request, res: Response) => {
    res.json(await this.service.list(validated<ListProjectsQuery>(res, 'query')));
  };

  getBySlug = async (_req: Request, res: Response) => {
    const { slug } = validated<{ slug: string }>(res, 'params');
    res.json({ data: await this.service.getBySlug(slug) });
  };
}
