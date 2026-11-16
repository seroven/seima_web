// Los 6 pasos del cotizador. Cada paso es una pregunta; la lógica vive en lib/quote.ts y los controles
// (campos, chips, tarjetas, dropdown…) en el kit compartido components/ui.
// Los servicios y las preguntas por servicio NO están escritos aquí: vienen del catálogo de la API (GET /quote-form).
import { motion } from 'motion/react';
import { useEffect, useId, useMemo, useRef } from 'react';
import { Chip, Chips, Collapse, Combobox, Field, Icon, OptionCard, OptionGrid, TextArea, TextInput } from '../ui';
import {
  DISTRITOS, MAX_FOTOS, MAX_NOTAS, MAX_VALOR_TEXTO, PLAZOS, errorDeValor, formatCelular, gruposDePreguntas, seleccionesDe,
  type Catalogo, type OpcionCatalogo, type PreguntaCatalogo, type QuoteData, type Seleccion,
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
interface ServiciosProps extends P {
  catalogo: Catalogo | null;
  /** Mensaje si no se pudo cargar el catálogo. */
  catalogoError: string | null;
  onReintentar: () => void;
}

export function StepServicios({ data, set, catalogo, catalogoError, onReintentar }: ServiciosProps) {
  const toggle = (slug: string) => set('servicios', data.servicios.includes(slug) ? data.servicios.filter((s) => s !== slug) : [...data.servicios, slug]);

  if (!catalogo) {
    return catalogoError ? (
      <div className="q-stack">
        <p className="q-error" role="alert">{catalogoError}</p>
        <div className="q-nav">
          <button type="button" className="q-back" onClick={onReintentar}>Reintentar</button>
        </div>
      </div>
    ) : (
      <p className="q-help" role="status">Cargando opciones…</p>
    );
  }

  return (
    <>
      <p className="q-help">Puedes elegir varias.</p>
      <OptionGrid role="group" label="Servicios" columns={2}>
        {catalogo.servicios.map((s) => (
          <OptionCard key={s.slug} type="checkbox" name="servicios" checked={data.servicios.includes(s.slug)} onChange={() => toggle(s.slug)} icon={s.icono} title={s.nombre} />
        ))}
      </OptionGrid>
    </>
  );
}

/* ---------- Campo que aparece al elegir una opción que pide un dato extra ("Otro" → ¿cuál?, "Sé el área" → m²) ---------- */
function CampoEntrada({ opcion, valor, onChange }: { opcion: OpcionCatalogo; valor: string; onChange: (v: string) => void }) {
  const id = useId();
  const numero = opcion.tipoEntrada === 'numero';
  // Solo se marca error cuando ya escribió algo inválido (vacío no se regaña hasta que intenta continuar)
  const error = valor.trim() !== '' ? errorDeValor(opcion, valor) : null;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.2, 0.7, 0, 1] }}>
      <Field id={id} label={opcion.etiqueta} error={error}>
        <TextInput
          id={id}
          autoFocus
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          inputMode={numero ? 'decimal' : 'text'}
          maxLength={numero ? 9 : MAX_VALOR_TEXTO}
          placeholder={numero ? '0' : (opcion.entradaAyuda ?? 'Escribe aquí')}
          suffix={numero ? (opcion.entradaAyuda ?? undefined) : undefined}
          aria-invalid={error ? true : undefined}
        />
      </Field>
    </motion.div>
  );
}

/**
 * Una pregunta del catálogo: sus opciones como chips (o tarjetas si TODAS traen descripción) y, para cada opción elegida
 * que pide un dato extra, su campo. Sirve igual para preguntas de una opción o de varias.
 */
function PreguntaControl({ p, sel, onChange }: { p: PreguntaCatalogo; sel: Seleccion[]; onChange: (s: Seleccion[]) => void }) {
  const elegida = (slug: string) => sel.some((x) => x.opcion === slug);
  const nueva = (o: OpcionCatalogo): Seleccion => (o.tipoEntrada === 'ninguna' ? { opcion: o.slug } : { opcion: o.slug, valor: '' });
  const alternar = (o: OpcionCatalogo) => {
    if (p.tipo === 'unica') onChange(elegida(o.slug) ? [] : [nueva(o)]); // tocar de nuevo la elegida la quita
    else onChange(elegida(o.slug) ? sel.filter((x) => x.opcion !== o.slug) : [...sel, nueva(o)]);
  };
  const cambiarValor = (slug: string, valor: string) => onChange(sel.map((x) => (x.opcion === slug ? { ...x, valor } : x)));
  const conCampo = p.opciones.filter((o) => elegida(o.slug) && o.tipoEntrada !== 'ninguna');

  return (
    <>
      {p.opciones.length > 0 && p.opciones.every((o) => o.descripcion) ? (
        <OptionGrid role="radiogroup" label={p.texto}>
          {p.opciones.map((o) => (
            <OptionCard key={o.slug} type="radio" name={p.slug} checked={elegida(o.slug)} onChange={() => onChange([nueva(o)])} title={o.etiqueta} desc={o.descripcion ?? undefined} compact />
          ))}
        </OptionGrid>
      ) : (
        <Chips label={p.texto}>
          {p.opciones.map((o) => <Chip key={o.slug} checked={elegida(o.slug)} onClick={() => alternar(o)}>{o.etiqueta}</Chip>)}
        </Chips>
      )}
      {conCampo.map((o) => (
        <CampoEntrada key={o.slug} opcion={o} valor={sel.find((x) => x.opcion === o.slug)?.valor ?? ''} onChange={(v) => cambiarValor(o.slug, v)} />
      ))}
    </>
  );
}

/* ---------- 3 · Cuéntanos del espacio ---------- */
export function StepEspacio({ data, set, catalogo }: P & { catalogo: Catalogo | null }) {
  const grupos = catalogo ? gruposDePreguntas(catalogo, data.servicios) : [];

  const responder = (slug: string, lista: Seleccion[]) => {
    const { [slug]: _quitada, ...resto } = data.respuestas;
    set('respuestas', lista.length ? { ...resto, [slug]: lista } : resto);
  };

  // Las medidas ya no son un bloque aparte: son la pregunta "Área" del catálogo, como las demás
  return (
    <div className="q-stack">
      {grupos.map((g) => (
        <fieldset className="q-block" key={g.clave}>
          <legend>{g.titulo}</legend>
          {g.preguntas.map((p) => (
            <div key={p.slug} className="q-pregunta">
              <p className="q-sub">{p.texto}</p>
              <PreguntaControl p={p} sel={seleccionesDe(data.respuestas, p.slug)} onChange={(l) => responder(p.slug, l)} />
            </div>
          ))}
        </fieldset>
      ))}
      {catalogo && grupos.length === 0 && <p className="q-help">No hay más preguntas para lo que elegiste. Puedes continuar.</p>}
    </div>
  );
}

/* ---------- 4 · ¿Dónde y cuándo? ---------- */
export function StepLugar({ data, set, files, onFiles }: P & { files: File[]; onFiles: (f: File[]) => void }) {
  const idD = useId();
  const idN = useId();
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

      <Field id={idN} label="¿Algo más que debamos saber?" hint="Opcional. Por ejemplo: horarios para ir a ver el lugar, si hay mascotas o cómo se entra.">
        <TextArea id={idN} maxLength={MAX_NOTAS} placeholder="Escribe aquí lo que quieras contarnos" value={data.notas} onChange={(e) => set('notas', e.target.value)} />
        <span className="q-count" aria-hidden="true">{data.notas.length}/{MAX_NOTAS}</span>
      </Field>
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
  catalogo: Catalogo | null;
  tituloProyecto: string | null;
  consent: boolean;
  onConsent: (v: boolean) => void;
  website: string;
  onWebsite: (v: string) => void;
}

export function StepResumen({ data, catalogo, tituloProyecto, consent, onConsent, website, onWebsite }: ResumenProps) {
  const idW = useId();
  const filas = resumenFilas(data, tituloProyecto, catalogo);
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
