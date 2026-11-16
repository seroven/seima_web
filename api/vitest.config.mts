import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        // Unitarias: sin base de datos ni red. Repositorios simulados; autosuficientes (no leen .env.*).
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['tests/unit/setup.ts'],
        },
      },
      {
        // Integración: API real contra la base de pruebas (se vacía y se recrea con las migraciones).
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/integration/global-setup.ts'],
          fileParallelism: false, // comparten la misma base de pruebas
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
