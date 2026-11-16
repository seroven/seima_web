// Datos del usuario autenticado (los pone el middleware JWT en las rutas protegidas del panel).
declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; rol: 'admin' };
    }
  }
}

export {};
