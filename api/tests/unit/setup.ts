// Las pruebas unitarias no dependen de ningún .env.*: fijan aquí lo mínimo ANTES de que se cargue src/config/env.ts.
// (dotenv no pisa variables ya definidas, así que un .env.test local no las altera.)
process.env.APP_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'secreto-solo-para-pruebas-unitarias-0123456789';
process.env.JWT_ISSUER = 'seima-api';
process.env.JWT_AUDIENCE = 'seima-panel';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '10';
process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
process.env.DB_SCHEMA = 'public';
