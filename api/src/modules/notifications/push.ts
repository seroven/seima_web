// Aviso push cuando llega una cotización. Si Firebase falla o no está configurado, no se pierde la solicitud.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from '../../common/logger';
import { env } from '../../config/env';

export interface AvisoCotizacion {
  id: string;
  servicio: string;
  distrito: string;
}

function messaging() {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) return null;
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getMessaging();
}

/** Texto sin datos del cliente (ni teléfono ni nombre). */
export function textoAviso(aviso: AvisoCotizacion): string {
  return aviso.distrito ? `Nueva cotización: ${aviso.servicio}, ${aviso.distrito}` : `Nueva cotización: ${aviso.servicio}`;
}

export async function enviarAvisoCotizacion(aviso: AvisoCotizacion, tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  try {
    const fcm = messaging();
    if (!fcm) {
      logger.info({ quoteId: aviso.id }, 'Firebase no está configurado: la cotización quedó guardada sin aviso');
      return;
    }
    await fcm.sendEachForMulticast({
      tokens,
      notification: { title: 'Nueva cotización', body: textoAviso(aviso) },
      data: { quoteId: aviso.id },
      android: { priority: 'high' },
    });
  } catch (err) {
    logger.warn({ err, quoteId: aviso.id }, 'No se pudo enviar el aviso de la cotización');
  }
}
