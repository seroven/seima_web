// Resumen en texto de una solicitud (se guarda en quotes.mensaje; el panel lo muestra y sirve para responder por WhatsApp).
import { ACABADOS, PLAZOS, SERVICIOS } from './quote.constants';
import type { Cliente, MedidasModo } from './quote.constants';

export interface MessageInput {
  cliente: Cliente;
  servicios: string[];
  medidasModo: MedidasModo;
  largo: number | null;
  ancho: number | null;
  areaM2: number | null;
  acabado: string | null;
  muebleAlto: string | null;
  estructura: string | null;
  ambientes: number | null;
  distrito: string;
  plazo: string;
  fotos: number;
  nombre: string;
  whatsapp: string; // 9 dígitos
  razonSocial: string | null;
  ruc: string | null;
}

const formatCelular = (d: string) => [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(' ');

export function medidasTexto(m: Pick<MessageInput, 'medidasModo' | 'largo' | 'ancho' | 'areaM2'>): string {
  if (m.medidasModo === 'nose' || !m.areaM2) return 'por definir';
  if (m.medidasModo === 'm2') return `${m.areaM2} m²`;
  return m.largo && m.ancho ? `${m.largo} × ${m.ancho} m (≈ ${m.areaM2} m²)` : 'por definir';
}

export function buildQuoteMessage(d: MessageInput, tituloProyecto?: string | null): string {
  const lines: string[] = ['*Nueva solicitud · SEIMA web*'];
  lines.push(d.cliente === 'empresa' ? `Cliente: Empresa — ${d.razonSocial ?? ''}${d.ruc ? ` (RUC ${d.ruc})` : ''}` : 'Cliente: Persona');
  lines.push(`Servicios: ${d.servicios.map((s) => SERVICIOS[s] ?? s).join(', ')}`);
  lines.push(`Medidas: ${medidasTexto(d)}`);
  if (d.acabado) lines.push(`Acabado: ${ACABADOS[d.acabado] ?? d.acabado}`);
  if (d.servicios.includes('cocina')) {
    const alto = d.muebleAlto === 'si' ? 'con mueble alto' : d.muebleAlto === 'no' ? 'sin mueble alto' : 'mueble alto por definir';
    const est = d.estructura === 'hay' ? 'ya hay estructura' : d.estructura === 'cero' ? 'desde cero' : 'estructura por definir';
    lines.push(`Cocina: ${alto}, ${est}`);
  }
  if (d.servicios.includes('departamento') && d.ambientes) lines.push(`Departamento: ${d.ambientes} ambiente${d.ambientes === 1 ? '' : 's'}`);
  lines.push(`Distrito: ${d.distrito} · Plazo: ${PLAZOS[d.plazo] ?? d.plazo}`);
  lines.push(d.fotos > 0 ? `Fotos: ${d.fotos} adjunta${d.fotos === 1 ? '' : 's'}` : 'Fotos: sin fotos');
  if (tituloProyecto) lines.push(`Referencia: proyecto «${tituloProyecto}»`);
  lines.push(`Contacto: ${d.nombre} · ${formatCelular(d.whatsapp)}`);
  return lines.join('\n');
}
