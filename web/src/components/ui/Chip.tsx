// Chip de selección simple (botón con aria-pressed). Agrupar con <Chips>.
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import './ui.css';

export function Chips({ children, label }: { children: ReactNode; label?: string }) {
  return <div className="ui-chips" role="group" aria-label={label}>{children}</div>;
}

interface Props {
  checked: boolean;
  onClick: () => void;
  children: ReactNode;
}

export default function Chip({ checked, onClick, children }: Props) {
  return (
    <motion.button type="button" className={`ui-chip${checked ? ' is-on' : ''}`} aria-pressed={checked} onClick={onClick} whileTap={{ scale: 0.95 }} transition={{ duration: 0.15 }}>
      {children}
    </motion.button>
  );
}
