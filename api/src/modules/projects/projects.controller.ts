import type { Request, Response } from 'express';
import { validated } from '../../common/middleware/validate';
import type { PanelProjectsService } from './projects-panel.service';
import type {
  ConfirmMediaInput,
  CreateMediaInput,
  CreateProjectInput,
  GestionQuery,
  ListProjectsQuery,
  ReorderMediaInput,
  SetPairInput,
  UpdateProjectInput,
} from './projects.schemas';
import type { EstadoProyecto } from './projects.types';
import type { ProjectsService } from './projects.service';

export class ProjectsController {
  constructor(
    private readonly service: ProjectsService,
    private readonly panel: PanelProjectsService,
  ) {}

  list = async (_req: Request, res: Response) => {
    res.json(await this.service.list(validated<ListProjectsQuery>(res, 'query')));
  };

  getBySlug = async (_req: Request, res: Response) => {
    const { slug } = validated<{ slug: string }>(res, 'params');
    res.json({ data: await this.service.getBySlug(slug) });
  };

  gestion = async (_req: Request, res: Response) => {
    res.json(await this.panel.list(validated<GestionQuery>(res, 'query')));
  };

  getGestion = async (_req: Request, res: Response) => {
    const { id } = validated<{ id: string }>(res, 'params');
    res.json({ data: await this.panel.get(id) });
  };

  create = async (_req: Request, res: Response) => {
    res.status(201).json({ data: await this.panel.create(validated<CreateProjectInput>(res, 'body')) });
  };

  update = async (_req: Request, res: Response) => {
    const { id } = validated<{ id: string }>(res, 'params');
    res.json({ data: await this.panel.update(id, validated<UpdateProjectInput>(res, 'body')) });
  };

  remove = async (_req: Request, res: Response) => {
    const { id } = validated<{ id: string }>(res, 'params');
    await this.panel.remove(id);
    res.status(204).end();
  };

  setEstado = async (_req: Request, res: Response) => {
    const { id } = validated<{ id: string }>(res, 'params');
    const { estado } = validated<{ estado: EstadoProyecto }>(res, 'body');
    res.json({ data: await this.panel.setEstado(id, estado) });
  };

  setComparador = async (_req: Request, res: Response) => {
    const { id } = validated<{ id: string }>(res, 'params');
    res.json({ data: await this.panel.setComparador(id, validated<SetPairInput>(res, 'body')) });
  };

  setPortada = async (_req: Request, res: Response) => {
    const { id } = validated<{ id: string }>(res, 'params');
    res.json({ data: await this.panel.setPortada(id, validated<SetPairInput>(res, 'body')) });
  };

  crearMedio = async (_req: Request, res: Response) => {
    const { id } = validated<{ id: string }>(res, 'params');
    res.status(201).json({ data: await this.panel.crearMedio(id, validated<CreateMediaInput>(res, 'body')) });
  };

  confirmarMedio = async (_req: Request, res: Response) => {
    const { id, medioId } = validated<{ id: string; medioId: string }>(res, 'params');
    res.json({ data: await this.panel.confirmarMedio(id, medioId, validated<ConfirmMediaInput>(res, 'body')) });
  };

  borrarMedio = async (_req: Request, res: Response) => {
    const { id, medioId } = validated<{ id: string; medioId: string }>(res, 'params');
    res.json({ data: await this.panel.borrarMedio(id, medioId) });
  };

  reordenar = async (_req: Request, res: Response) => {
    const { id } = validated<{ id: string }>(res, 'params');
    res.json({ data: await this.panel.reordenar(id, validated<ReorderMediaInput>(res, 'body')) });
  };
}
