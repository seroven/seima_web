import { UploadsController } from './uploads.controller';
import { uploadsRoutes } from './uploads.routes';
import { UploadsService } from './uploads.service';

/** No usa la base de datos: solo firma con el secret de Cloudinary (que vive en el .env). */
export function buildUploadsModule() {
  const service = new UploadsService();
  const router = uploadsRoutes(new UploadsController(service));
  return { service, router };
}
