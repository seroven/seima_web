// Resumen en vivo: se va armando mientras la persona responde.
import { AnimatePresence, motion } from 'motion/react';
import { ACABADOS, PLAZOS, formatCelular, medidasTexto, pideAcabado, servicioLabel, type QuoteData } from '../../lib/quote';

interface Row {
  key: string;
  label: string;
  value: string;
}

export function resumenFilas(d: QuoteData, tituloProyecto: string | null): Row[] {
  const rows: Row[] = [];
  if (tituloProyecto) rows.push({ key: 'ref', label: 'Basado en', value: tituloProyecto });
  if (d.cliente) rows.push({ key: 'cliente', label: 'Para', value: d.cliente === 'empresa' ? `Empresa${d.razonSocial ? ` · ${d.razonSocial}` : ''}` : 'Persona' });
  if (d.servicios.length) rows.push({ key: 'serv', label: 'Necesitas', value: d.servicios.map(servicioLabel).join(', ') });
  const medidas = medidasTexto(d);
  if (d.servicios.length && (d.largo || d.ancho || d.m2 || d.medidasModo === 'nose')) rows.push({ key: 'med', label: 'Medidas', value: medidas });
  if (pideAcabado(d) && d.acabado) rows.push({ key: 'acab', label: 'Acabado', value: ACABADOS.find((a) => a.id === d.acabado)?.label ?? '' });
  if (d.servicios.includes('cocina') && (d.muebleAlto || d.estructura)) {
    const alto = d.muebleAlto === 'si' ? 'mueble alto' : d.muebleAlto === 'no' ? 'sin mueble alto' : '';
    const est = d.estructura === 'hay' ? 'ya hay estructura' : d.estructura === 'cero' ? 'desde cero' : '';
    rows.push({ key: 'cocina', label: 'Cocina', value: [alto, est].filter(Boolean).join(' · ') });
  }
  if (d.servicios.includes('departamento')) rows.push({ key: 'amb', label: 'Ambientes', value: String(d.ambientes) });
  if (d.distrito.trim()) rows.push({ key: 'dist', label: 'Lugar', value: d.distrito.trim() });
  if (d.plazo) rows.push({ key: 'plazo', label: 'Plazo', value: PLAZOS.find((p) => p.id === d.plazo)?.label ?? '' });
  if (d.fotos > 0) rows.push({ key: 'fotos', label: 'Fotos', value: `${d.fotos} adjunta${d.fotos === 1 ? '' : 's'}` });
  if (d.nombre.trim()) rows.push({ key: 'nom', label: 'Contacto', value: `${d.nombre.trim()}${d.whatsapp ? ` · ${formatCelular(d.whatsapp)}` : ''}` });
  return rows;
}

export default function Summary({ data, tituloProyecto }: { data: QuoteData; tituloProyecto: string | null }) {
  const rows = resumenFilas(data, tituloProyecto);
  return (
    <div className="q-summary">
      <p className="q-summary__title">Tu solicitud</p>
      {rows.length === 0 ? (
        <p className="q-summary__empty">Aquí se irá armando tu solicitud a medida que respondas.</p>
      ) : (
        <ul className="q-summary__list">
          <AnimatePresence initial={false} mode="popLayout">
            {rows.map((r) => (
              <motion.li
                key={r.key}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.3, ease: [0.2, 0.7, 0, 1] }}
              >
                <span className="q-summary__k">{r.label}</span>
                <span className="q-summary__v">{r.value}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
