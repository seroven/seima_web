// Pantalla de envío del cotizador: un avión de papel cruza el cielo (el símbolo universal de "enviar") mientras se suben
// las fotos y se guarda la solicitud. Debajo, el estado real ("Subiendo foto 2 de 3…") y una pastilla por foto.
// Cuando la API responde, el avión se va y aparece la palomita ("¡Listo!") antes de pasar a la pantalla final.
// Solo se animan transform y opacity (reglas del proyecto). Con "reducir movimiento" se ve el avión quieto, sin bucles.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface Props {
  /** Texto de estado (p. ej. "Subiendo foto 2 de 3…"). */
  label: string;
  /** Fotos ya subidas y total (total 0 = sin fotos: no se muestran las pastillas). */
  photos: { hechas: number; total: number };
  /** true cuando la API ya respondió: el avión se va y aparece la palomita. */
  finishing: boolean;
}

const EASE = [0.2, 0.7, 0, 1] as const;
const CICLO = 2.1; // segundos que tarda el avión en cruzar

// Trayectoria del avión (en unidades del dibujo, viewBox 240 × 150): sube en arco de abajo-izquierda a arriba-derecha.
const T = [0, 0.12, 0.42, 0.62, 0.86, 1];
const X = [18, 44, 104, 148, 200, 226];
const Y = [112, 92, 56, 48, 24, 8];
const R = [-18, -32, -16, 4, -14, -20]; // inclinación en grados (negativo = nariz hacia arriba)
const O = [0, 1, 1, 1, 1, 0];

/** Posición sobre la trayectoria en el instante t (0–1), para colocar la estela. */
function punto(t: number): [number, number] {
  let i = 0;
  while (i < T.length - 2 && t > T[i + 1]) i++;
  const k = (t - T[i]) / (T[i + 1] - T[i]);
  return [X[i] + (X[i + 1] - X[i]) * k, Y[i] + (Y[i + 1] - Y[i]) * k];
}
const ESTELA = [0.18, 0.27, 0.36, 0.46, 0.56, 0.66, 0.76].map((t) => ({ t, pos: punto(t) }));
const caja = { transformBox: 'fill-box' as const, transformOrigin: 'center' as const };

export default function Sending({ label, photos, finishing }: Props) {
  const reduce = useReducedMotion();
  const quieto = reduce && !finishing; // con "reducir movimiento": avión fijo a mitad de camino

  return (
    <div className="q-sending" role="status" aria-live="polite">
      <svg className="q-sky" viewBox="0 0 240 150" aria-hidden="true">
        {/* Nubes (fijas): solo dan sensación de cielo */}
        <g className="cloud">
          <ellipse cx="52" cy="42" rx="22" ry="8" />
          <ellipse cx="68" cy="37" rx="14" ry="8" />
          <ellipse cx="178" cy="112" rx="24" ry="8" />
          <ellipse cx="196" cy="106" rx="14" ry="8" />
        </g>

        {/* Estela: puntos que aparecen detrás del avión y se apagan */}
        {ESTELA.map(({ t, pos }, i) => (
          <motion.circle
            key={i}
            className="trail"
            cx={pos[0]}
            cy={pos[1] + 2}
            r={3.2 - i * 0.25}
            style={caja}
            initial={{ opacity: 0 }}
            animate={finishing ? { opacity: 0 } : quieto ? { opacity: 0.5 } : { opacity: [0, 0, 0.6, 0, 0] }}
            transition={
              finishing || quieto
                ? { duration: 0.3 }
                : { duration: CICLO, times: [0, t, Math.min(t + 0.04, 0.99), Math.min(t + 0.3, 0.995), 1], repeat: Infinity, ease: 'linear' }
            }
          />
        ))}

        {/* El avión de papel */}
        <motion.g
          style={caja}
          initial={{ x: X[0], y: Y[0], rotate: R[0], opacity: 0 }}
          animate={
            finishing
              ? { x: 262, y: -8, rotate: -26, opacity: 0 }
              : quieto
                ? { x: X[2], y: Y[2], rotate: R[2], opacity: 1 }
                : { x: X, y: Y, rotate: R, opacity: O }
          }
          transition={
            finishing
              ? { duration: reduce ? 0 : 0.55, ease: [0.5, 0, 0.9, 0.4] }
              : quieto
                ? { duration: 0 }
                : { duration: CICLO, times: T, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          {/* el dibujo está a escala 1; se agranda aquí para que se lea bien */}
          <g transform="scale(1.9)">
            <polygon className="plane plane--a" points="20,0 -14,-11 -3,2" />
            <polygon className="plane plane--b" points="20,0 -3,2 -9,11" />
            <polygon className="plane plane--c" points="-3,2 -14,-11 -9,11" />
          </g>
        </motion.g>

        {/* Palomita: aparece cuando el avión ya se fue */}
        <motion.g
          style={caja}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={finishing ? { scale: 1, opacity: 1 } : { scale: 0.3, opacity: 0 }}
          transition={finishing ? { type: 'spring', stiffness: 360, damping: 16, delay: reduce ? 0 : 0.3 } : { duration: 0 }}
        >
          <circle className="seal" cx="120" cy="75" r="32" />
          <polyline className="seal__check" points="104,76 115,87 137,63" />
        </motion.g>
      </svg>

      <div className="q-sending__text">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={finishing ? 'listo' : 'enviando'}
            className="q-sending__title"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
          >
            {finishing ? '¡Listo!' : 'Enviando tu solicitud'}
          </motion.h2>
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={finishing ? 'ok' : label}
            className="q-sending__status"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
          >
            {finishing ? 'Ya está con nosotros' : label}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Una pastilla por foto: se va llenando a medida que sube */}
      {photos.total > 0 && (
        <div className="q-dots" aria-hidden="true">
          {Array.from({ length: photos.total }, (_, i) => {
            const estado = finishing || i < photos.hechas ? 'hecha' : i === photos.hechas ? 'actual' : 'pendiente';
            return (
              <motion.i
                key={i}
                data-estado={estado}
                initial={{ scale: 1 }}
                animate={{ scale: estado === 'actual' && !reduce ? [1, 1.4, 1] : 1 }}
                transition={estado === 'actual' && !reduce ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : { duration: reduce ? 0 : 0.3, ease: EASE }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
