// Opción tipo tarjeta (radio o checkbox accesible, con ícono y marca de selección animada). Agrupar con <OptionGrid>.
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import Icon from './Icon';
import './ui.css';

export function OptionGrid({ children, columns = 2, role, label }: { children: ReactNode; columns?: 1 | 2 | 3; role?: 'radiogroup' | 'group'; label?: string }) {
  return (
    <div className="ui-grid" role={role} aria-label={label} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
}

interface Props {
  type: 'radio' | 'checkbox';
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  desc?: string;
  icon?: string;
  compact?: boolean;
}

export default function OptionCard({ type, name, checked, onChange, title, desc, icon, compact }: Props) {
  return (
    <motion.label className={`ui-opt${checked ? ' is-on' : ''}${compact ? ' ui-opt--compact' : ''}`} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
      <input className="ui-sr" type={type} name={name} checked={checked} onChange={onChange} />
      {icon && <Icon name={icon} size={compact ? 22 : 30} />}
      <span className="ui-opt__text">
        <span className="ui-opt__t">{title}</span>
        {desc && <span className="ui-opt__d">{desc}</span>}
      </span>
      <AnimatePresence>
        {checked && (
          <motion.span className="ui-opt__check" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 28 }}>
            <Icon name="check" size={16} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.label>
  );
}
