// Lista de entidades de la base. AL CREAR UNA ENTIDAD NUEVA: añádela aquí y genera su migración
// (`npm run migration:generate -- src/database/migrations/Nombre`). Una prueba (tests/entities.test.ts)
// avisa si hay un archivo *.entity.ts que falta en esta lista.
import { AdminUser } from '../modules/auth/admin-user.entity';
import { RefreshToken } from '../modules/auth/refresh-token.entity';
import { OpcionPregunta } from '../modules/catalog/opcion-pregunta.entity';
import { Pregunta } from '../modules/catalog/pregunta.entity';
import { Servicio } from '../modules/catalog/servicio.entity';
import { Visit } from '../modules/analytics/visit.entity';
import { Category } from '../modules/categories/category.entity';
import { DeviceToken } from '../modules/devices/device-token.entity';
import { ProjectMedia } from '../modules/projects/project-media.entity';
import { Project } from '../modules/projects/project.entity';
import { QuotePhoto } from '../modules/quotes/quote-photo.entity';
import { Quote } from '../modules/quotes/quote.entity';
import { RespuestaCotizacion } from '../modules/quotes/respuesta-cotizacion.entity';

export const entities = [Category, Project, ProjectMedia, Servicio, Pregunta, OpcionPregunta, Quote, QuotePhoto, RespuestaCotizacion, AdminUser, RefreshToken, DeviceToken, Visit];
