// Cotizador guiado (isla de React + Motion). Un paso = una pregunta.
// Al final se envía directo a la API: las fotos se suben a Cloudinary y la solicitud queda registrada en la base de datos.
// WhatsApp ya no es el canal de envío: es donde respondemos (y un botón opcional para escribirnos).
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui';
import Summary, { resumenFilas } from './Summary';
import { StepCliente, StepDatos, StepEspacio, StepLugar, StepResumen, StepServicios } from './Steps';
import { projects } from '../../data/projects';
import { CATEGORIA_A_SERVICIO, SendError, emptyQuote, formatCelular, submitQuote, validarPaso, type QuoteData } from '../../lib/quote';
import { waLink } from '../../lib/whatsapp';
import './quote.css';

const TITLES = ['¿Para quién es?', '¿Qué necesitas?', 'Cuéntanos del espacio', '¿Dónde y cuándo?', 'Tus datos', 'Revisa y envía'];
const LAST = TITLES.length - 1;
const KEY = 'seima:quote:v1';

export default function Quote() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [data, setData] = useState<QuoteData>(emptyQuote);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState('');
  const [consent, setConsent] = useState(false); // se pide en cada envío: no se recuerda
  const [website, setWebsite] = useState(''); // campo trampa anti-robots (siempre vacío para una persona)
  const [ready, setReady] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const proyecto = projects.find((p) => p.slug === data.proyecto) ?? null;
  const tituloProyecto = proyecto?.titulo ?? null;

  // Al montar: preselección desde la URL (?categoria=&proyecto=) o recuperar lo que se estaba llenando
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const cat = q.get('categoria');
    const slug = q.get('proyecto');
    const servicio = cat ? CATEGORIA_A_SERVICIO[cat] : undefined;
    const cli = q.get('cliente');
    if (cli === 'empresa' || cli === 'persona') {
      // Viene de la página Empresas ("Solicitar propuesta"): ya sabemos quién es, se salta la primera pregunta
      setData((d) => ({ ...d, cliente: cli }));
      setStep(1);
    }
    if (servicio || slug) {
      setData((d) => ({ ...d, servicios: servicio ? [servicio] : d.servicios, proyecto: projects.some((p) => p.slug === slug) ? slug : null }));
    } else if (!cli) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
        if (saved?.data) {
          setData({ ...emptyQuote, ...saved.data, fotos: 0 });
          setStep(Math.min(saved.step ?? 0, LAST));
        }
      } catch {
        /* sin almacenamiento */
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ data: { ...data, fotos: 0 }, step }));
    } catch {
      /* modo privado */
    }
  }, [data, step, ready]);

  useEffect(() => setData((d) => (d.fotos === files.length ? d : { ...d, fotos: files.length })), [files]);

  // Al cambiar de paso: foco en el título y la tarjeta a la vista (no en la primera carga)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    top.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [step, reduce]);

  const set = <K extends keyof QuoteData>(key: K, value: QuoteData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
    setError(null);
  };

  const next = () => {
    const e = validarPaso(step, data);
    if (e) return setError(e);
    go(step + 1);
  };

  const clearSaved = () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nada */
    }
  };

  const send = async () => {
    if (sending) return;
    if (!consent) return setError('Marca la casilla para poder enviar tu solicitud.');
    setSending(true);
    setError(null);
    setProgress(files.length ? 'Preparando tus fotos…' : 'Enviando tu solicitud…');
    try {
      await submitQuote(data, {
        files,
        website,
        onProgress: (hechas, total) => setProgress(hechas < total ? `Subiendo foto ${hechas + 1} de ${total}…` : 'Enviando tu solicitud…'),
      });
      clearSaved();
      setSent(true);
      top.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    } catch (e) {
      // Nada se pierde: lo que escribió y las fotos siguen ahí para reintentar
      setError(e instanceof SendError ? e.message : 'No pudimos enviar tu solicitud. Inténtalo otra vez.');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setData(emptyQuote);
    setFiles([]);
    setConsent(false);
    setWebsite('');
    setSent(false);
    clearSaved();
    setStep(0);
    setDir(-1);
  };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 48 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -48 }),
  };

  const filas = resumenFilas(data, tituloProyecto);
  // Primer nombre con mayúscula inicial (si lo escribieron TODO EN MAYÚSCULAS, el saludo no grita)
  const primero = data.nombre.trim().split(/\s+/)[0] ?? '';
  const nombre = primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase();
  const wa = waLink(`Hola, soy ${data.nombre.trim()}. Acabo de enviar una solicitud desde la web de SEIMA.`);

  return (
    <div className="q" ref={top}>
      <div className="q-main">
        <div className="q-progress" role="progressbar" aria-label="Progreso del cotizador" aria-valuemin={1} aria-valuemax={TITLES.length} aria-valuenow={sent ? TITLES.length : step + 1}>
          <motion.i initial={false} animate={{ scaleX: sent ? 1 : (step + 1) / TITLES.length }} transition={{ duration: reduce ? 0 : 0.5, ease: [0.2, 0.7, 0, 1] }} />
        </div>
        <p className="q-stepno" aria-live="polite">{sent ? 'Solicitud enviada' : `Paso ${step + 1} de ${TITLES.length}`}</p>

        {sent ? (
          <motion.div className="q-done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="q-done__icon"><Icon name="check" size={30} /></span>
            <h2>¡Recibimos tu solicitud{nombre ? `, ${nombre}` : ''}!</h2>
            <p>
              Revisamos tu pedido y te escribimos por WhatsApp al <strong>{formatCelular(data.whatsapp)}</strong> con la cotización.
              {' '}Si prefieres, también puedes escribirnos tú.
            </p>
            <div className="q-nav">
              {wa ? (
                <a className="btn" href={wa} target="_blank" rel="noopener">Escríbenos por WhatsApp</a>
              ) : (
                <span className="btn btn--off q-off" aria-disabled="true">Escríbenos por WhatsApp · [NÚMERO PENDIENTE]</span>
              )}
              <button type="button" className="q-back" onClick={reset}>Hacer otra cotización</button>
            </div>
          </motion.div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (step === LAST) void send();
              else next();
            }}
          >
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: reduce ? 0 : 0.32, ease: [0.2, 0.7, 0, 1] }}>
                <h2 className="q-title" ref={heading} tabIndex={-1}>{TITLES[step]}</h2>
                {step === 0 && <StepCliente data={data} set={set} />}
                {step === 1 && <StepServicios data={data} set={set} />}
                {step === 2 && <StepEspacio data={data} set={set} />}
                {step === 3 && <StepLugar data={data} set={set} files={files} onFiles={setFiles} />}
                {step === 4 && <StepDatos data={data} set={set} />}
                {step === 5 && (
                  <StepResumen
                    data={data}
                    tituloProyecto={tituloProyecto}
                    consent={consent}
                    onConsent={(v) => {
                      setConsent(v);
                      setError(null);
                    }}
                    website={website}
                    onWebsite={setWebsite}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            <p className="q-error" role="alert">{error}</p>

            <div className="q-nav">
              {step > 0 && (
                <button type="button" className="q-back" disabled={sending} onClick={() => go(step - 1)}>
                  <Icon name="arrow-left" size={18} /> Atrás
                </button>
              )}
              {step < LAST ? (
                <motion.button type="submit" className="btn q-next" whileTap={{ scale: 0.97 }}>
                  Continuar <Icon name="arrow-right" size={18} />
                </motion.button>
              ) : (
                <motion.button type="submit" className="btn q-next" disabled={sending} aria-busy={sending} whileTap={{ scale: 0.97 }}>
                  {sending ? progress : <>Enviar solicitud <Icon name="arrow-right" size={18} /></>}
                </motion.button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Resumen en vivo: columna fija en escritorio */}
      <aside className="q-side" aria-label="Resumen de tu solicitud">
        <Summary data={data} tituloProyecto={tituloProyecto} />
      </aside>

      {/* En celular: barra inferior que despliega el resumen */}
      <div className="q-sheet">
        <AnimatePresence>
          {sheet && (
            <motion.div className="q-sheet__panel" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: reduce ? 0 : 0.35, ease: [0.2, 0.7, 0, 1] }}>
              <Summary data={data} tituloProyecto={tituloProyecto} />
            </motion.div>
          )}
        </AnimatePresence>
        <button type="button" className="q-sheet__bar" aria-expanded={sheet} onClick={() => setSheet((s) => !s)}>
          <span>Tu solicitud{filas.length ? ` · ${filas.length}` : ''}</span>
          <motion.span animate={{ rotate: sheet ? 180 : 0 }} transition={{ duration: 0.25 }}><Icon name="chevron-up" size={20} /></motion.span>
        </button>
      </div>
    </div>
  );
}
