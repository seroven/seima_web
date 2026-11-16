// Resumen en texto de una solicitud (se guarda en quotes.mensaje; el panel lo muestra y sirve para responder por WhatsApp).
// Es una "foto" del momento del envío: el dato estructurado vive en las tablas (quote_services, quote_answers…).
import { PLAZOS } from './quote.constants';
import type { Cliente } from './quote.constants';
import type { ResumenRespuesta } from './quote-answers';

export interface MessageInput {
  cliente: Cliente;
  /** Nombres de los servicios (no slugs). */
  servicios: string[];
  /** Respuestas ya resueltas a etiqueta/valor, en el orden del catálogo (incluyen las medidas). */
  respuestas: ResumenRespuesta[];
  distrito: string;
  plazo: string;
  notas: string | null;
  fotos: number;
  nombre: string;
  whatsapp: string; // 9 dígitos
  razonSocial: string | null;
  ruc: string | null;
}

const formatCelular = (d: string) => [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(' ');

export function buildQuoteMessage(d: MessageInput, tituloProyecto?: string | null): string {
  const lines: string[] = ['*Nueva solicitud · SEIMA web*'];
  lines.push(d.cliente === 'empresa' ? `Cliente: Empresa — ${d.razonSocial ?? ''}${d.ruc ? ` (RUC ${d.ruc})` : ''}` : 'Cliente: Persona');
  lines.push(`Servicios: ${d.servicios.join(', ')}`);
  for (const r of d.respuestas) lines.push(`${r.etiqueta}: ${r.valor}`);
  lines.push(`Distrito: ${d.distrito} · Plazo: ${PLAZOS[d.plazo] ?? d.plazo}`);
  lines.push(d.fotos > 0 ? `Fotos: ${d.fotos} adjunta${d.fotos === 1 ? '' : 's'}` : 'Fotos: sin fotos');
  if (d.notas) lines.push(`Notas: ${d.notas}`);
  if (tituloProyecto) lines.push(`Referencia: proyecto «${tituloProyecto}»`);
  lines.push(`Contacto: ${d.nombre} · ${formatCelular(d.whatsapp)}`);
  return lines.join('\n');
}
