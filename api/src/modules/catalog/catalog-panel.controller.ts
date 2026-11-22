import type { Request, Response } from 'express';
import { validated } from '../../common/middleware/validate';
import type { ReorderInput } from '../../common/schemas';
import type { CatalogPanelService } from './catalog-panel.service';
import type { CreateOptionInput, CreateQuestionInput, CreateServiceInput, UpdateOptionInput, UpdateQuestionInput, UpdateServiceInput } from './catalog.schemas';

const id = (res: Response) => validated<{ id: string }>(res, 'params').id;

/** Capa HTTP de la gestión del catálogo del cotizador (app de Luis). Sin lógica de negocio. */
export class CatalogPanelController {
  constructor(private readonly panel: CatalogPanelService) {}

  listServices = async (_req: Request, res: Response) => {
    res.json({ data: await this.panel.listServices() });
  };
  createService = async (_req: Request, res: Response) => {
    res.status(201).json({ data: await this.panel.createService(validated<CreateServiceInput>(res, 'body')) });
  };
  updateService = async (_req: Request, res: Response) => {
    res.json({ data: await this.panel.updateService(id(res), validated<UpdateServiceInput>(res, 'body')) });
  };
  reorderServices = async (_req: Request, res: Response) => {
    res.json({ data: await this.panel.reorderServices(validated<ReorderInput>(res, 'body').ids) });
  };

  listQuestions = async (_req: Request, res: Response) => {
    res.json({ data: await this.panel.listQuestions() });
  };
  getQuestion = async (_req: Request, res: Response) => {
    res.json({ data: await this.panel.getQuestion(id(res)) });
  };
  createQuestion = async (_req: Request, res: Response) => {
    res.status(201).json({ data: await this.panel.createQuestion(validated<CreateQuestionInput>(res, 'body')) });
  };
  updateQuestion = async (_req: Request, res: Response) => {
    res.json({ data: await this.panel.updateQuestion(id(res), validated<UpdateQuestionInput>(res, 'body')) });
  };
  reorderQuestions = async (_req: Request, res: Response) => {
    res.json({ data: await this.panel.reorderQuestions(validated<ReorderInput>(res, 'body').ids) });
  };

  createOption = async (_req: Request, res: Response) => {
    res.status(201).json({ data: await this.panel.createOption(id(res), validated<CreateOptionInput>(res, 'body')) });
  };
  updateOption = async (_req: Request, res: Response) => {
    res.json({ data: await this.panel.updateOption(id(res), validated<UpdateOptionInput>(res, 'body')) });
  };
  reorderOptions = async (_req: Request, res: Response) => {
    res.json({ data: await this.panel.reorderOptions(id(res), validated<ReorderInput>(res, 'body').ids) });
  };
}
