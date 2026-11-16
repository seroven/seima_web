// Cotizador guiado (isla de React + Motion). Un paso = una pregunta.
// Al final se envía directo a la API: las fotos se suben a Cloudinary y la solicitud queda registrada en la base de datos.
// WhatsApp ya no es el canal de envío: es donde respondemos (y un botón opcional para escribirnos).
// Fases: formulario → enviando (pantalla de carga animada) → listo (pantalla final animada).
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui';
import Sending from './Sending';
import Summary, { resumenFilas } from './Summary';
import { StepCliente, StepDatos, StepEspacio, StepLugar, StepResumen, StepServicios } from './Steps';
import { projects } from '../../data/projects';
import { CATEGORIA_A_SERVICIO, SendError, emptyQuote, fetchCatalogo, formatCelular, normalizarRespuestas, submitQuote, validarPaso, type Catalogo, type QuoteData } from '../../lib/quote';
import { waLink } from '../../lib/whatsapp';
import './quote.css';

const TITLES = ['¿Para quién es?', '¿Qué necesitas?', 'Cuéntanos del espacio', '¿Dónde y cuándo?', 'Tus datos', 'Revisa y envía'];
const LAST = TITLES.length - 1;
const KEY = 'seima:quote:v2'; // v2: las respuestas cambiaron de formato (lista de opciones con su dato extra)
const EASE = [0.2, 0.7, 0, 1] as const;

// Aunque la API responda al instante, la pantalla de carga se ve un momento para que se entienda (y no parpadee).
const MIN_CARGA_MS = 1500;
const CIERRE_MS = 800; // la pared se completa ("¡Listo!") antes de pasar a la pantalla final
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Fase = 'form' | 'sending' | 'done';

export default function Quote() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [data, setData] = useState<QuoteData>(emptyQuote);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [fase, setFase] = useState<Fase>('form');
  const [finishing, setFinishing] = useState(false);
  const [progress, setProgress] = useState('');
  const [photoProg, setPhotoProg] = useState({ hechas: 0, total: 0 });
  const [consent, setConsent] = useState(false); // se pide en cada envío: no se recuerda
  const [website, setWebsite] = useState(''); // campo trampa anti-robots (siempre vacío para una persona)
  const [ready, setReady] = useState(false);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null); // servicios y preguntas (vienen de la API)
  const [catalogoError, setCatalogoError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);
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

  // Carga del catálogo: qué servicios hay y qué se pregunta en cada uno
  const cargarCatalogo = () => {
    setCatalogoError(null);
    fetchCatalogo().then(setCatalogo, (e) => setCatalogoError(e instanceof SendError ? e.message : 'No pudimos cargar las opciones. Inténtalo otra vez.'));
  };
  useEffect(cargarCatalogo, []);

  // Las respuestas siguen a los servicios elegidos: se descartan las de servicios que se quitaron (o que ya no existen en el
  // catálogo) y a las preguntas numéricas se les pone su mínimo. Solo se actualiza si algo cambió.
  useEffect(() => {
    if (!catalogo) return;
    setData((d) => {
      const nuevas = normalizarRespuestas(catalogo, d.servicios, d.respuestas);
      return JSON.stringify(nuevas) === JSON.stringify(d.respuestas) ? d : { ...d, respuestas: nuevas };
    });
  }, [catalogo, data.servicios]);

  // Al cambiar de paso: foco en el título y la tarjeta a la vista (no en la primera carga)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    top.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [step, reduce]);

  // Al llegar a la pantalla final: foco en el título (lectores de pantalla)
  useEffect(() => {
    if (fase === 'done') doneHeading.current?.focus({ preventScroll: true });
  }, [fase]);

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
    const e = validarPaso(step, data, catalogo);
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

  const verTarjeta = () => top.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

  const send = async () => {
    if (fase !== 'form' || !catalogo) return;
    if (!consent) return setError('Marca la casilla para poder enviar tu solicitud.');
    setError(null);
    setFinishing(false);
    setPhotoProg({ hechas: 0, total: files.length });
    setProgress(files.length ? 'Preparando tus fotos…' : 'Enviando tu solicitud…');
    setFase('sending');
    verTarjeta();
    const inicio = Date.now();
    try {
      await submitQuote(data, catalogo, {
        files,
        website,
        onProgress: (hechas, total) => {
          setPhotoProg({ hechas, total });
          setProgress(hechas < total ? `Subiendo foto ${hechas + 1} de ${total}…` : 'Enviando tu solicitud…');
        },
      });
      if (!reduce) await sleep(Math.max(0, MIN_CARGA_MS - (Date.now() - inicio)));
      setFinishing(true); // la pared se completa
      if (!reduce) await sleep(CIERRE_MS);
      clearSaved();
      setFase('done');
      verTarjeta();
    } catch (e) {
      // Nada se pierde: lo que escribió y las fotos siguen ahí para reintentar
      setError(e instanceof SendError ? e.message : 'No pudimos enviar tu solicitud. Inténtalo otra vez.');
      setFase('form');
    }
  };

  const reset = () => {
    setData(emptyQuote);
    setFiles([]);
    setConsent(false);
    setWebsite('');
    setFinishing(false);
    setFase('form');
    clearSaved();
    setStep(0);
    setDir(-1);
  };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 48 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -48 }),
  };

  // Pantalla final: los elementos entran uno tras otro
  const finalContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1, delayChildren: reduce ? 0 : 0.05 } },
  };
  const subir: Variants = {
    hidden: { opacity: reduce ? 1 : 0, y: reduce ? 0 : 18 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.5, ease: EASE } },
  };
  const revelar: Variants = {
    hidden: { clipPath: reduce ? 'inset(-10% -2% -10% -2%)' : 'inset(0 0 100% 0)', y: reduce ? 0 : 22 },
    show: { clipPath: 'inset(-10% -2% -10% -2%)', y: 0, transition: { duration: reduce ? 0 : 0.6, ease: EASE } },
  };

  const filas = resumenFilas(data, tituloProyecto, catalogo);
  const primero = data.nombre.trim().split(/\s+/)[0] ?? '';
  // Primer nombre con mayúscula inicial (si lo escribieron TODO EN MAYÚSCULAS, el saludo no grita)
  const nombre = primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase();
  const wa = waLink(`Hola, soy ${data.nombre.trim()}. Acabo de enviar una solicitud desde la web de SEIMA.`);
  const terminado = fase === 'done';

  return (
    <div className="q" ref={top}>
      <div className="q-main">
        <div className="q-progress" role="progressbar" aria-label="Progreso del cotizador" aria-valuemin={1} aria-valuemax={TITLES.length} aria-valuenow={terminado || fase === 'sending' ? TITLES.length : step + 1}>
          <motion.i initial={false} animate={{ scaleX: terminado || fase === 'sending' ? 1 : (step + 1) / TITLES.length }} transition={{ duration: reduce ? 0 : 0.5, ease: EASE }} />
        </div>
        <p className="q-stepno" aria-live="polite">
          {terminado ? 'Solicitud enviada' : fase === 'sending' ? 'Enviando…' : `Paso ${step + 1} de ${TITLES.length}`}
        </p>

        <AnimatePresence mode="wait" initial={false}>
          {fase === 'sending' ? (
            <motion.div
              key="sending"
              initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
              transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
            >
              <Sending label={progress} photos={photoProg} finishing={finishing} />
            </motion.div>
          ) : terminado ? (
            <motion.div key="done" className="q-done" variants={finalContainer} initial="hidden" animate="show">
              <motion.span className="q-done__icon" variants={{ hidden: { scale: reduce ? 1 : 0.4, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 380, damping: 18 } } }}>
                {/* Un solo destello que se expande desde el ícono (no es un bucle) */}
                {!reduce && (
                  <motion.span
                    className="q-done__ring"
                    aria-hidden="true"
                    initial={{ scale: 1, opacity: 0.45 }}
                    animate={{ scale: 2.4, opacity: 0 }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
                  />
                )}
                {/* La palomita se descubre de izquierda a derecha */}
                <motion.span
                  className="q-done__check"
                  initial={{ clipPath: reduce ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)' }}
                  animate={{ clipPath: 'inset(0 0 0 0)' }}
                  transition={{ duration: reduce ? 0 : 0.35, ease: EASE, delay: reduce ? 0 : 0.25 }}
                >
                  <Icon name="check" size={30} />
                </motion.span>
              </motion.span>

              <motion.h2 ref={doneHeading} tabIndex={-1} variants={revelar}>
                ¡Recibimos tu solicitud{nombre ? `, ${nombre}` : ''}!
              </motion.h2>
              <motion.p variants={subir}>
                Revisamos tu pedido y te escribimos por WhatsApp al <strong>{formatCelular(data.whatsapp)}</strong> con la cotización.
                {' '}Si prefieres, también puedes escribirnos tú.
              </motion.p>
              <motion.div className="q-nav" variants={subir}>
                {wa ? (
                  <a className="btn" href={wa} target="_blank" rel="noopener">Escríbenos por WhatsApp</a>
                ) : (
                  <span className="btn btn--off q-off" aria-disabled="true">Escríbenos por WhatsApp · [NÚMERO PENDIENTE]</span>
                )}
                <button type="button" className="q-back" onClick={reset}>Hacer otra cotización</button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              noValidate
              initial={{ opacity: 0, y: reduce ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -10 }}
              transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
              onSubmit={(e) => {
                e.preventDefault();
                if (step === LAST) void send();
                else next();
              }}
            >
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}>
                  <h2 className="q-title" ref={heading} tabIndex={-1}>{TITLES[step]}</h2>
                  {step === 0 && <StepCliente data={data} set={set} />}
                  {step === 1 && <StepServicios data={data} set={set} catalogo={catalogo} catalogoError={catalogoError} onReintentar={cargarCatalogo} />}
                  {step === 2 && <StepEspacio data={data} set={set} catalogo={catalogo} />}
                  {step === 3 && <StepLugar data={data} set={set} files={files} onFiles={setFiles} />}
                  {step === 4 && <StepDatos data={data} set={set} />}
                  {step === 5 && (
                    <StepResumen
                      data={data}
                      catalogo={catalogo}
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
                  <button type="button" className="q-back" onClick={() => go(step - 1)}>
                    <Icon name="arrow-left" size={18} /> Atrás
                  </button>
                )}
                <motion.button type="submit" className="btn q-next" whileTap={{ scale: 0.97 }}>
                  {step < LAST ? 'Continuar' : 'Enviar solicitud'} <Icon name="arrow-right" size={18} />
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Resumen en vivo: columna fija en escritorio */}
      <aside className="q-side" aria-label="Resumen de tu solicitud">
        <Summary data={data} tituloProyecto={tituloProyecto} catalogo={catalogo} />
      </aside>

      {/* En celular: barra inferior que despliega el resumen */}
      <div className="q-sheet">
        <AnimatePresence>
          {sheet && (
            <motion.div className="q-sheet__panel" data-lenis-prevent initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}>
              <Summary data={data} tituloProyecto={tituloProyecto} catalogo={catalogo} />
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
