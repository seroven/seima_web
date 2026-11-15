// Despliega/pliega contenido animando la altura. El recorte (overflow) SOLO existe mientras dura la animación;
// al terminar queda visible para no cortar el anillo de foco de los controles de adentro.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

interface Props {
  show: boolean;
  children: ReactNode;
  className?: string;
}

export default function Collapse({ show, children, className }: Props) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          className={className}
          initial={reduce ? false : { height: 0, opacity: 0, overflow: 'hidden' }}
          animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0, overflow: 'hidden' }}
          transition={{ duration: reduce ? 0 : 0.3, ease: [0.2, 0.7, 0, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
