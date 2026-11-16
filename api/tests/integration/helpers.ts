import 'reflect-metadata';
import request from 'supertest';
import { afterAll, beforeAll } from 'vitest';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { AppDataSource } from '../../src/database/data-source';

export const API = env.API_PREFIX;
export const agent = () => request(createApp(AppDataSource));

/** Conecta la base una vez por archivo de pruebas y la cierra al terminar. */
export function useDatabase() {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  });
  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });
}

export const cotizacionValida = {
  cliente: 'persona',
  servicios: ['cocina'],
  medidasModo: 'lxa',
  largo: '4',
  ancho: '3',
  distrito: 'Comas',
  plazo: '1mes',
  nombre: 'Ana Prueba',
  whatsapp: '987 654 321',
};
