import type { RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { DevicesController } from './devices.controller';
import { DevicesRepository } from './devices.repository';
import { devicesRoutes } from './devices.routes';
import { DevicesService } from './devices.service';

export function buildDevicesModule(dataSource: DataSource, authenticate: RequestHandler) {
  const repository = new DevicesRepository(dataSource);
  const service = new DevicesService(repository);
  const router = devicesRoutes(new DevicesController(service), authenticate);
  return { repository, service, router };
}
