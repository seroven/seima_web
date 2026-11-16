import { Router } from 'express';
import type { DataSource } from 'typeorm';

/** GET /health: para que Render (u otro servicio) sepa si la API y la base están vivas. */
export function healthRoutes(dataSource: DataSource): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    let db: 'up' | 'down' = 'up';
    try {
      await dataSource.query('SELECT 1');
    } catch {
      db = 'down';
    }
    res.status(db === 'up' ? 200 : 503).json({ status: db === 'up' ? 'ok' : 'degraded', db, uptime: Math.round(process.uptime()) });
  });
  return router;
}
