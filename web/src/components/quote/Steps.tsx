// Los 6 pasos del cotizador. Cada paso es una pregunta; la lógica y las opciones viven en lib/quote.ts.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import Icon from './Icon';
import {
  ACABADOS, DISTRITOS, PLAZOS, SERVICIOS, areaDe, buildMessage, formatCelular, pideAcabado,
  type QuoteData,
} from '../../lib/quote';

type SetFn = <K extends keyof QuoteData>(key: K, value: QuoteData[K]) => void;
interface P {
  data: QuoteData;
  set: SetFn;
}

/* ---------- Opción tipo tarjeta (radio o checkbox accesible) ---------- */
function Opt({
  type, name, checked, onChange, icon, title, desc, compact,
}: { type: 'radio' | 'checkbox'; name: string; checked: boolean; onChange: () => void; icon?: string; title: string; desc?: string; compact?: boolean }) {
  return (
    <motion.label className={`q-opt${checked ? ' is-on' : ''}${compact ? ' q-opt--compact' : ''}`} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
      <input className="q-sr" type={type} name={name} checked={checked} onChange={onChange} />
      {icon && <Icon name={icon} size={compact ? 22 : 30} />}
      <span className="q-opt__text">
        <span className="q-opt__t">{title}</span>
        {desc && <span className="q-opt__d">{desc}</span>}
      </span>
      <AnimatePresence>
        {checked && (
          <motion.span className="q-opt__check" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 28 }}>
            <Icon name="check" size={14} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.label>
  );
}

function Chip({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button type="button" className={`q-chip${checked ? ' is-on' : ''}`} aria-pressed={checked} onClick={onClick} whileTap={{ scale: 0.95 }} transition={{ duration: 0.15 }}>
      {children}
    </motion.button>
  );
}

function Field({ label, hint, children, id }: { label: string; hint?: string; children: ReactNode; id: string }) {
  return (
    <div className="q-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}

/* ---------- 1 · ¿Para quién es? ---------- */
export function StepCliente({ data, set }: P) {
  return (
    <div className="q-grid q-grid--2" role="radiogroup" aria-label="Tipo de cliente">
      <Opt type="radio" name="cliente" checked={data.cliente === 'persona'} onChange={() => set('cliente', 'persona')} icon="persona" title="Para mí" desc="Casa, departamento, cocina, baño…" />
      <Opt type="radio" name="cliente" checked={data.cliente === 'empresa'} onChange={() => set('cliente', 'empresa')} icon="empresa" title="Para una empresa" desc="Local, varios departamentos u obra" />
    </div>
  );
}

/* ---------- 2 · ¿Qué necesitas? ---------- */
export function StepServicios({ data, set }: P) {
  const toggle = (id: string) => set('servicios', data.servicios.includes(id) ? data.servicios.filter((s) => s !== id) : [...data.servicios, id]);
  return (
    <>
      <p className="q-help">Puedes elegir varias.</p>
      <div className="q-grid q-grid--services" role="group" aria-label="Servicios">
        {SERVICIOS.map((s) => (
          <Opt key={s.id} type="checkbox" name="servicios" checked={data.servicios.includes(s.id)} onChange={() => toggle(s.id)} icon={s.icon} title={s.label} />
        ))}
      </div>
    </>
  );
}

/* ---------- 3 · Cuéntanos del espacio ---------- */
export function StepEspacio({ data, set }: P) {
  const idL = useId();
  const idA = useId();
  const idM = useId();
  const area = areaDe(data);
  const reduce = useReducedMotion();
  const appear = reduce ? {} : { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 }, transition: { duration: 0.3, ease: [0.2, 0.7, 0, 1] as const } };

  return (
    <div className="q-stack">
      <fieldset className="q-block">
        <legend>Medidas aproximadas</legend>
        <div className="q-chips">
          <Chip checked={data.medidasModo === 'lxa'} onClick={() => set('medidasModo', 'lxa')}>Largo × ancho</Chip>
          <Chip checked={data.medidasModo === 'm2'} onClick={() => set('medidasModo', 'm2')}>Solo los m²</Chip>
          <Chip checked={data.medidasModo === 'nose'} onClick={() => set('medidasModo', 'nose')}>Aún no lo sé</Chip>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {data.medidasModo === 'lxa' && (
            <motion.div key="lxa" className="q-row" {...appear}>
              <Field id={idL} label="Largo (m)">
                <input id={idL} inputMode="decimal" placeholder="4" value={data.largo} onChange={(e) => set('largo', e.target.value)} />
              </Field>
              <span className="q-x" aria-hidden="true">×</span>
              <Field id={idA} label="Ancho (m)">
                <input id={idA} inputMode="decimal" placeholder="3" value={data.ancho} onChange={(e) => set('ancho', e.target.value)} />
              </Field>
              <p className="q-area" aria-live="polite">{area ? `≈ ${area} m²` : ''}</p>
            </motion.div>
          )}
          {data.medidasModo === 'm2' && (
            <motion.div key="m2" className="q-row" {...appear}>
              <Field id={idM} label="Área (m²)">
                <input id={idM} inputMode="decimal" placeholder="12" value={data.m2} onChange={(e) => set('m2', e.target.value)} />
              </Field>
            </motion.div>
          )}
          {data.medidasModo === 'nose' && (
            <motion.p key="nose" className="q-help" {...appear}>Sin problema: Luis puede ir a medir o tú se las mandas luego.</motion.p>
          )}
        </AnimatePresence>
      </fieldset>

      <AnimatePresence initial={false}>
        {pideAcabado(data) && (
          <motion.fieldset key="acabado" className="q-block" {...appear}>
            <legend>Nivel de acabado</legend>
            <div className="q-grid q-grid--2" role="radiogroup">
              {ACABADOS.map((a) => (
                <Opt key={a.id} type="radio" name="acabado" checked={data.acabado === a.id} onChange={() => set('acabado', a.id)} title={a.label} desc={a.desc} compact />
              ))}
            </div>
          </motion.fieldset>
        )}

        {data.servicios.includes('cocina') && (
          <motion.fieldset key="cocina" className="q-block" {...appear}>
            <legend>Sobre la cocina</legend>
            <p className="q-sub">¿Quieres mueble alto?</p>
            <div className="q-chips">
              <Chip checked={data.muebleAlto === 'si'} onClick={() => set('muebleAlto', 'si')}>Sí</Chip>
              <Chip checked={data.muebleAlto === 'no'} onClick={() => set('muebleAlto', 'no')}>No</Chip>
              <Chip checked={data.muebleAlto === 'nose'} onClick={() => set('muebleAlto', 'nose')}>No sé</Chip>
            </div>
            <p className="q-sub">¿Ya hay estructura o es desde cero?</p>
            <div className="q-chips">
              <Chip checked={data.estructura === 'hay'} onClick={() => set('estructura', 'hay')}>Ya hay estructura</Chip>
              <Chip checked={data.estructura === 'cero'} onClick={() => set('estructura', 'cero')}>Desde cero</Chip>
            </div>
          </motion.fieldset>
        )}

        {data.servicios.includes('departamento') && (
          <motion.fieldset key="depa" className="q-block" {...appear}>
            <legend>Sobre el departamento</legend>
            <p className="q-sub">¿Cuántos ambientes?</p>
            <div className="q-stepper">
              <button type="button" aria-label="Menos ambientes" onClick={() => set('ambientes', Math.max(1, data.ambientes - 1))} disabled={data.ambientes <= 1}>−</button>
              <output aria-live="polite">{data.ambientes}</output>
              <button type="button" aria-label="Más ambientes" onClick={() => set('ambientes', Math.min(10, data.ambientes + 1))} disabled={data.ambientes >= 10}>+</button>
            </div>
          </motion.fieldset>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- 4 · ¿Dónde y cuándo? ---------- */
export function StepLugar({ data, set, files, onFiles }: P & { files: File[]; onFiles: (f: File[]) => void }) {
  const idD = useId();
  const list = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => ({ f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list).filter((f) => f.type.startsWith('image/'))].slice(0, 6);
    onFiles(next);
  };

  return (
    <div className="q-stack">
      <Field id={idD} label="Distrito o ciudad">
        <input id={idD} list={list} placeholder="Ej. Los Olivos" autoComplete="off" value={data.distrito} onChange={(e) => set('distrito', e.target.value)} />
        <datalist id={list}>{DISTRITOS.map((d) => <option key={d} value={d} />)}</datalist>
      </Field>

      <fieldset className="q-block">
        <legend>¿Para cuándo?</legend>
        <div className="q-chips">
          {PLAZOS.map((p) => <Chip key={p.id} checked={data.plazo === p.id} onClick={() => set('plazo', p.id)}>{p.label}</Chip>)}
        </div>
      </fieldset>

      <fieldset className="q-block">
        <legend>Fotos del espacio <span className="q-opt-tag">opcional, recomendado</span></legend>
        <input ref={inputRef} className="q-sr" type="file" accept="image/*" multiple onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
        <div className="q-photos">
          {previews.map((p, i) => (
            <motion.div key={p.url} className="q-photo" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
              <img src={p.url} alt={`Foto ${i + 1} del espacio`} />
              <button type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => onFiles(files.filter((_, j) => j !== i))}><Icon name="close" size={14} /></button>
            </motion.div>
          ))}
          {files.length < 6 && (
            <button type="button" className="q-photo q-photo--add" onClick={() => inputRef.current?.click()}>
              <Icon name="camera" size={24} />
              <span>Añadir</span>
            </button>
          )}
        </div>
        <p className="q-help">Hasta 6 fotos. Por ahora se las envías a Luis por el mismo chat de WhatsApp al final.</p>
      </fieldset>
    </div>
  );
}

/* ---------- 5 · Tus datos ---------- */
export function StepDatos({ data, set }: P) {
  const idN = useId();
  const idW = useId();
  const idR = useId();
  const idC = useId();
  const reduce = useReducedMotion();
  return (
    <div className="q-stack">
      <Field id={idN} label="Tu nombre">
        <input id={idN} autoComplete="name" placeholder="Nombre y apellido" value={data.nombre} onChange={(e) => set('nombre', e.target.value)} />
      </Field>
      <Field id={idW} label="Tu WhatsApp" hint="Solo para que Luis te responda.">
        <div className="q-phone">
          <span aria-hidden="true">+51</span>
          <input id={idW} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="9XX XXX XXX" value={formatCelular(data.whatsapp)} onChange={(e) => set('whatsapp', e.target.value)} />
        </div>
      </Field>
      <AnimatePresence initial={false}>
        {data.cliente === 'empresa' && (
          <motion.div key="emp" className="q-stack" initial={reduce ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
            <Field id={idR} label="Razón social">
              <input id={idR} autoComplete="organization" placeholder="Nombre de la empresa" value={data.razonSocial} onChange={(e) => set('razonSocial', e.target.value)} />
            </Field>
            <Field id={idC} label="RUC" hint="Opcional.">
              <input id={idC} inputMode="numeric" placeholder="11 dígitos" maxLength={11} value={data.ruc} onChange={(e) => set('ruc', e.target.value.replace(/\D/g, ''))} />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- 6 · Resumen: el mensaje aparece como burbuja ---------- */
export function StepResumen({ data, tituloProyecto }: { data: QuoteData; tituloProyecto: string | null }) {
  const reduce = useReducedMotion();
  const text = buildMessage(data, tituloProyecto);
  const lines = text.split('\n');
  const [typing, setTyping] = useState(!reduce);
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setTyping(false), 900);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <div className="q-stack">
      <p className="q-help">Así le llegará a Luis por WhatsApp. Revisa que todo esté bien.</p>
      <div className="q-chat" aria-label="Vista previa del mensaje">
        <AnimatePresence mode="wait">
          {typing ? (
            <motion.div key="typing" className="q-bubble q-bubble--typing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} aria-hidden="true">
              <span /><span /><span />
            </motion.div>
          ) : (
            <motion.div key="msg" className="q-bubble" initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, ease: [0.2, 0.7, 0, 1] }}>
              {lines.map((l, i) => (
                <motion.p key={i} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.07, duration: 0.3 }}>
                  {l.startsWith('*') && l.endsWith('*') ? <strong>{l.slice(1, -1)}</strong> : l}
                </motion.p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
