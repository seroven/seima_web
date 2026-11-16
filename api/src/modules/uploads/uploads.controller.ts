import type { Request, Response } from 'express';
import type { UploadsService } from './uploads.service';

export class UploadsController {
  constructor(private readonly service: UploadsService) {}

  signQuotePhotos = (_req: Request, res: Response) => {
    res.json({ data: this.service.signQuotePhotos() });
  };
}
