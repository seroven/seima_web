// Los 6 pasos del cotizador. Cada paso es una pregunta; la lógica y las opciones viven en lib/quote.ts
// y los controles (campos, chips, tarjetas, dropdown…) en el kit compartido components/ui.
import { motion } from 'motion/react';
import { useEffect, useId, useMemo, useRef } from 'react';
import { Chip, Chips, Collapse, Combobox, Field, Icon, OptionCard, OptionGrid, Stepper, TextInput } from '../ui';
import {
  ACABADOS, DISTRITOS, MAX_FOTOS, PLAZOS, SERVICIOS, areaDe, formatCelular, pideAcabado,
  type QuoteData,
} from '../../lib/quote';
import { resumenFilas } from './Summary';

type SetFn = <K extends keyof QuoteData>(key: K, value: QuoteData[K]) => void;
interface P {
  data: QuoteData;
  set: SetFn;
}

/* ---------- 1 · ¿Para quién es? ---------- */
export function StepCliente({ data, set }: P) {
  return (
    <OptionGrid role="radiogroup" label="Tipo de cliente">
      <OptionCard type="radio" name="cliente" checked={data.cliente === 'persona'} onChange={() => set('cliente', 'persona')} icon="persona" title="Para mí" desc="Casa, departamento, cocina, baño…" />
      <OptionCard type="radio" name="cliente" checked={data.cliente === 'empresa'} onChange={() => set('cliente', 'empresa')} icon="empresa" title="Para una empresa" desc="Local, varios departamentos u obra" />
    </OptionGrid>
  );
}

/* ---------- 2 · ¿Qué necesitas? ---------- */
export function StepServicios({ data, set }: P) {
  const toggle = (id: string) => set('servicios', data.servicios.includes(id) ? data.servicios.filter((s) => s !== id) : [...data.servicios, id]);
  return (
    <>
      <p className="q-help">Puedes elegir varias.</p>
      <OptionGrid role="group" label="Servicios" columns={2}>
        {SERVICIOS.map((s) => (
          <OptionCard key={s.id} type="checkbox" name="servicios" checked={data.servicios.includes(s.id)} onChange={() => toggle(s.id)} icon={s.icon} title={s.label} />
        ))}
      </OptionGrid>
    </>
  );
}

/* ---------- 3 · Cuéntanos del espacio ---------- */
export function StepEspacio({ data, set }: P) {
  const idL = useId();
  const idA = useId();
  const idM = useId();
  const area = areaDe(data);

  return (
    <div className="q-stack">
      <fieldset className="q-block">
        <legend>Medidas aproximadas</legend>
        <Chips label="Cómo prefieres indicar las medidas">
          <Chip checked={data.medidasModo === 'lxa'} onClick={() => set('medidasModo', 'lxa')}>Largo × ancho</Chip>
          <Chip checked={data.medidasModo === 'm2'} onClick={() => set('medidasModo', 'm2')}>Solo los m²</Chip>
          <Chip checked={data.medidasModo === 'nose'} onClick={() => set('medidasModo', 'nose')}>Aún no lo sé</Chip>
        </Chips>
        <Collapse show={data.medidasModo === 'lxa'}>
          <div className="q-row">
            <Field id={idL} label="Largo (m)">
              <TextInput id={idL} inputMode="decimal" placeholder="4" value={data.largo} onChange={(e) => set('largo', e.target.value)} />
            </Field>
            <span className="q-x" aria-hidden="true">×</span>
            <Field id={idA} label="Ancho (m)">
              <TextInput id={idA} inputMode="decimal" placeholder="3" value={data.ancho} onChange={(e) => set('ancho', e.target.value)} />
            </Field>
            <p className="q-area" aria-live="polite">{area ? `≈ ${area} m²` : ''}</p>
          </div>
        </Collapse>
        <Collapse show={data.medidasModo === 'm2'}>
          <div className="q-row">
            <Field id={idM} label="Área (m²)">
              <TextInput id={idM} inputMode="decimal" placeholder="12" value={data.m2} onChange={(e) => set('m2', e.target.value)} />
            </Field>
          </div>
        </Collapse>
        <Collapse show={data.medidasModo === 'nose'}>
          <p className="q-help q-help--top">Sin problema: podemos ir a medir o tú nos las mandas luego.</p>
        </Collapse>
      </fieldset>

      <Collapse show={pideAcabado(data)}>
        <fieldset className="q-block">
          <legend>Nivel de acabado</legend>
          <OptionGrid role="radiogroup" label="Nivel de acabado">
            {ACABADOS.map((a) => (
              <OptionCard key={a.id} type="radio" name="acabado" checked={data.acabado === a.id} onChange={() => set('acabado', a.id)} title={a.label} desc={a.desc} compact />
            ))}
          </OptionGrid>
        </fieldset>
      </Collapse>

      <Collapse show={data.servicios.includes('cocina')}>
        <fieldset className="q-block">
          <legend>Sobre la cocina</legend>
          <p className="q-sub">¿Quieres mueble alto?</p>
          <Chips label="Mueble alto">
            <Chip checked={data.muebleAlto === 'si'} onClick={() => set('muebleAlto', 'si')}>Sí</Chip>
            <Chip checked={data.muebleAlto === 'no'} onClick={() => set('muebleAlto', 'no')}>No</Chip>
            <Chip checked={data.muebleAlto === 'nose'} onClick={() => set('muebleAlto', 'nose')}>No sé</Chip>
          </Chips>
          <p className="q-sub">¿Ya hay estructura o es desde cero?</p>
          <Chips label="Estructura">
            <Chip checked={data.estructura === 'hay'} onClick={() => set('estructura', 'hay')}>Ya hay estructura</Chip>
            <Chip checked={data.estructura === 'cero'} onClick={() => set('estructura', 'cero')}>Desde cero</Chip>
          </Chips>
        </fieldset>
      </Collapse>

      <Collapse show={data.servicios.includes('departamento')}>
        <fieldset className="q-block">
          <legend>Sobre el departamento</legend>
          <p className="q-sub">¿Cuántos ambientes?</p>
          <Stepper value={data.ambientes} onChange={(n) => set('ambientes', n)} min={1} max={10} label="ambientes" />
        </fieldset>
      </Collapse>
    </div>
  );
}

/* ---------- 4 · ¿Dónde y cuándo? ---------- */
export function StepLugar({ data, set, files, onFiles }: P & { files: File[]; onFiles: (f: File[]) => void }) {
  const idD = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => ({ f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const add = (list: FileList | null) => {
    if (!list) return;
    onFiles([...files, ...Array.from(list).filter((f) => f.type.startsWith('image/'))].slice(0, MAX_FOTOS));
  };

  return (
    <div className="q-stack">
      <Field id={idD} label="Distrito o ciudad" hint="Elige de la lista o escribe el tuyo.">
        <Combobox id={idD} value={data.distrito} onChange={(v) => set('distrito', v)} options={DISTRITOS} placeholder="Ej. Los Olivos" allowCustom maxHeight="15rem" />
      </Field>

      <fieldset className="q-block">
        <legend>¿Para cuándo?</legend>
        <Chips label="Plazo">
          {PLAZOS.map((p) => <Chip key={p.id} checked={data.plazo === p.id} onClick={() => set('plazo', p.id)}>{p.label}</Chip>)}
        </Chips>
      </fieldset>

      <fieldset className="q-block">
        <legend>Fotos del espacio <span className="q-opt-tag">opcional, recomendado</span></legend>
        <input ref={inputRef} className="ui-sr" type="file" accept="image/*" multiple aria-label="Elegir fotos del espacio" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
        <div className="q-photos">
          {previews.map((p, i) => (
            <motion.div key={p.url} className="q-photo" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
              <img src={p.url} alt={`Foto ${i + 1} del espacio`} />
              <button type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => onFiles(files.filter((_, j) => j !== i))}><Icon name="close" size={14} /></button>
            </motion.div>
          ))}
          {files.length < MAX_FOTOS && (
            <button type="button" className="q-photo q-photo--add" onClick={() => inputRef.current?.click()}>
              <Icon name="camera" size={24} />
              <span>Añadir</span>
            </button>
          )}
        </div>
        <p className="q-help">Hasta 6 fotos. Se envían junto con tu solicitud.</p>
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
  return (
    <div className="q-stack">
      <Field id={idN} label="Tu nombre">
        <TextInput id={idN} autoComplete="name" placeholder="Nombre y apellido" value={data.nombre} onChange={(e) => set('nombre', e.target.value)} />
      </Field>
      <Field id={idW} label="Tu WhatsApp" hint="Solo para que podamos responderte.">
        <TextInput id={idW} prefix="+51" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="9XX XXX XXX" value={formatCelular(data.whatsapp)} onChange={(e) => set('whatsapp', e.target.value)} />
      </Field>
      <Collapse show={data.cliente === 'empresa'}>
        <div className="q-stack">
          <Field id={idR} label="Razón social">
            <TextInput id={idR} autoComplete="organization" placeholder="Nombre de la empresa" value={data.razonSocial} onChange={(e) => set('razonSocial', e.target.value)} />
          </Field>
          <Field id={idC} label="RUC" hint="Opcional.">
            <TextInput id={idC} inputMode="numeric" placeholder="11 dígitos" maxLength={11} value={data.ruc} onChange={(e) => set('ruc', e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>
      </Collapse>
    </div>
  );
}

/* ---------- 6 · Revisa y envía ---------- */
interface ResumenProps {
  data: QuoteData;
  tituloProyecto: string | null;
  consent: boolean;
  onConsent: (v: boolean) => void;
  website: string;
  onWebsite: (v: string) => void;
}

export function StepResumen({ data, tituloProyecto, consent, onConsent, website, onWebsite }: ResumenProps) {
  const idW = useId();
  const filas = resumenFilas(data, tituloProyecto);
  return (
    <div className="q-stack">
      <p className="q-help">Revisa que todo esté bien. Al enviar, nos llega tu solicitud y te respondemos por WhatsApp al número que dejaste.</p>
      <dl className="q-review">
        {filas.map((r) => (
          <div key={r.key}>
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <OptionGrid columns={1}>
          <OptionCard type="checkbox" compact name="consentimiento" checked={consent} onChange={() => onConsent(!consent)} title="Acepto que usen mis datos para responder a esta solicitud" />
        </OptionGrid>
        <p className="q-help q-help--top">
          Usamos tu nombre, WhatsApp y fotos solo para preparar tu cotización. <a href="/privacidad" target="_blank" rel="noopener">Cómo tratamos tus datos</a>.
        </p>
      </div>

      {/* Campo trampa: invisible para las personas; los robots suelen llenarlo y entonces la solicitud se descarta */}
      <div className="q-hp" aria-hidden="true">
        <label htmlFor={idW}>No escribas nada aquí</label>
        <input id={idW} type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => onWebsite(e.target.value)} />
      </div>
    </div>
  );
}
