// Cotizador guiado (isla de React + Motion). Un paso = una pregunta.
// Al final se guarda vía POST /quotes (si hay API) y se abre WhatsApp con el mensaje ya armado.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui';
import Summary, { resumenFilas } from './Summary';
import { StepCliente, StepDatos, StepEspacio, StepLugar, StepResumen, StepServicios } from './Steps';
import { projects } from '../../data/projects';
import {
  CATEGORIA_A_SERVICIO, buildMessage, emptyQuote, submitQuote, validarPaso, waHref, type QuoteData,
} from '../../lib/quote';
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
  const [copied, setCopied] = useState(false);
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

  const message = buildMessage(data, tituloProyecto);
  const href = waHref(message);

  const send = () => {
    if (href) window.open(href, '_blank', 'noopener'); // dentro del clic, para que no lo bloqueen
    void submitQuote(data); // guarda en la API si existe; si falla, WhatsApp igual salió
    setSent(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('No se pudo copiar. Selecciona el texto y cópialo manualmente.');
    }
  };

  const reset = () => {
    setData(emptyQuote);
    setFiles([]);
    setSent(false);
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nada */
    }
    setStep(0);
    setDir(-1);
  };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 48 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -48 }),
  };

  const filas = resumenFilas(data, tituloProyecto);

  return (
    <div className="q" ref={top}>
      <div className="q-main">
        <div className="q-progress" role="progressbar" aria-label="Progreso del cotizador" aria-valuemin={1} aria-valuemax={TITLES.length} aria-valuenow={step + 1}>
          <motion.i initial={false} animate={{ scaleX: (step + 1) / TITLES.length }} transition={{ duration: reduce ? 0 : 0.5, ease: [0.2, 0.7, 0, 1] }} />
        </div>
        <p className="q-stepno" aria-live="polite">Paso {step + 1} de {TITLES.length}</p>

        {sent ? (
          <motion.div className="q-done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="q-done__icon"><Icon name="check" size={30} /></span>
            <h2>¡Listo, {data.nombre.split(' ')[0] || 'gracias'}!</h2>
            <p>
              {href
                ? 'Se abrió WhatsApp con tu solicitud. Envía el mensaje (y las fotos, si tienes) y Luis te responde por ahí.'
                : 'Tu solicitud está lista. Aún no está configurado el número de WhatsApp de Luis [NÚMERO PENDIENTE]: copia el mensaje y envíaselo.'}
            </p>
            <div className="q-nav">
              {!href && <button type="button" className="btn q-next" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar mensaje'}</button>}
              <button type="button" className="q-back" onClick={reset}>Hacer otra cotización</button>
            </div>
          </motion.div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (step === LAST) send();
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
                {step === 5 && <StepResumen data={data} tituloProyecto={tituloProyecto} />}
              </motion.div>
            </AnimatePresence>

            <p className="q-error" role="alert">{error}</p>

            <div className="q-nav">
              {step > 0 && (
                <button type="button" className="q-back" onClick={() => go(step - 1)}>
                  <Icon name="arrow-left" size={18} /> Atrás
                </button>
              )}
              {step < LAST ? (
                <motion.button type="submit" className="btn q-next" whileTap={{ scale: 0.97 }}>
                  Continuar <Icon name="arrow-right" size={18} />
                </motion.button>
              ) : (
                <>
                  {href ? (
                    <motion.button type="submit" className="btn q-next" whileTap={{ scale: 0.97 }}>
                      Enviar por WhatsApp <Icon name="arrow-right" size={18} />
                    </motion.button>
                  ) : (
                    <span className="btn btn--off q-next" aria-disabled="true">Enviar por WhatsApp · [NÚMERO PENDIENTE]</span>
                  )}
                  <button type="button" className="q-back" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar mensaje'}</button>
                </>
              )}
            </div>
            {step === LAST && !href && (
              <p className="q-help">Mientras no esté el número de Luis, puedes copiar el mensaje y enviárselo.</p>
            )}
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
