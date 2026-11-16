// Resumen en vivo: se va armando mientras la persona responde.
import { AnimatePresence, motion } from 'motion/react';
import { PLAZOS, filasRespuestas, formatCelular, medidasTexto, servicioNombre, type Catalogo, type QuoteData } from '../../lib/quote';

interface Row {
  key: string;
  label: string;
  value: string;
}

export function resumenFilas(d: QuoteData, tituloProyecto: string | null, catalogo: Catalogo | null): Row[] {
  const rows: Row[] = [];
  if (tituloProyecto) rows.push({ key: 'ref', label: 'Basado en', value: tituloProyecto });
  if (d.cliente) rows.push({ key: 'cliente', label: 'Para', value: d.cliente === 'empresa' ? `Empresa${d.razonSocial ? ` · ${d.razonSocial}` : ''}` : 'Persona' });
  if (d.servicios.length) rows.push({ key: 'serv', label: 'Necesitas', value: d.servicios.map((s) => servicioNombre(catalogo, s)).join(', ') });
  const medidas = medidasTexto(d);
  if (d.servicios.length && (d.largo || d.ancho || d.m2 || d.medidasModo === 'nose')) rows.push({ key: 'med', label: 'Medidas', value: medidas });
  // Respuestas a las preguntas de los servicios elegidos (en el orden del catálogo)
  if (catalogo) for (const r of filasRespuestas(catalogo, d.servicios, d.respuestas)) rows.push({ key: `r-${r.slug}`, label: r.etiqueta, value: r.valor });
  if (d.distrito.trim()) rows.push({ key: 'dist', label: 'Lugar', value: d.distrito.trim() });
  if (d.plazo) rows.push({ key: 'plazo', label: 'Plazo', value: PLAZOS.find((p) => p.id === d.plazo)?.label ?? '' });
  if (d.notas.trim()) rows.push({ key: 'notas', label: 'Nota', value: d.notas.trim().length > 90 ? `${d.notas.trim().slice(0, 90)}…` : d.notas.trim() });
  if (d.fotos > 0) rows.push({ key: 'fotos', label: 'Fotos', value: `${d.fotos} adjunta${d.fotos === 1 ? '' : 's'}` });
  if (d.nombre.trim()) rows.push({ key: 'nom', label: 'Contacto', value: `${d.nombre.trim()}${d.whatsapp ? ` · ${formatCelular(d.whatsapp)}` : ''}` });
  return rows;
}

export default function Summary({ data, tituloProyecto, catalogo }: { data: QuoteData; tituloProyecto: string | null; catalogo: Catalogo | null }) {
  const rows = resumenFilas(data, tituloProyecto, catalogo);
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
