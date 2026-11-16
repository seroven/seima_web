// Dropdown reutilizable (combobox con búsqueda), con el estilo de la web.
// - Lista con alto máximo (por defecto 15rem) y scroll interno estilizado.
//   `data-lenis-prevent` en la lista: sin él, Lenis (scroll suave de la página) se queda con la rueda del mouse y la lista no se desplaza.
// - Teclado: ↑ ↓ Inicio Fin, Enter elige, Esc cierra, Tab cierra. Con Enter sin opción activa deja enviar el formulario.
// - `allowCustom`: permite escribir un valor que no está en la lista (p. ej. un distrito poco común).
// - Se abre hacia arriba si abajo no hay espacio.
// - Patrón ARIA combobox/listbox. La opción activa se anuncia con aria-activedescendant.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import Icon from './Icon';
import TextInput from './TextInput';
import './ui.css';

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  allowCustom?: boolean;
  /** Alto máximo de la lista (cualquier medida CSS). */
  maxHeight?: string;
  emptyText?: string;
  autoComplete?: string;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function resaltar(label: string, query: string): ReactNode {
  const q = norm(query);
  if (!q) return label;
  const i = norm(label).indexOf(q);
  if (i < 0 || norm(label) === q) return label;
  return (
    <>
      {label.slice(0, i)}
      <mark>{label.slice(i, i + q.length)}</mark>
      {label.slice(i + q.length)}
    </>
  );
}

export default function Combobox({ id, value, onChange, options, placeholder, allowCustom = true, maxHeight, emptyText = 'No hay coincidencias', autoComplete = 'off' }: Props) {
  const reduce = useReducedMotion();
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [up, setUp] = useState(false);

  // Si lo escrito ya es una opción exacta, se muestran todas (para poder cambiar); si no, se filtra.
  const exacto = options.some((o) => norm(o) === norm(value));
  const filtradas = useMemo(() => (!value.trim() || exacto ? [...options] : options.filter((o) => norm(o).includes(norm(value)))), [options, value, exacto]);

  const abrir = () => {
    if (open) return;
    // ¿Hay espacio abajo? (se deja margen para barras fijas)
    const r = wrap.current?.getBoundingClientRect();
    if (r) setUp(innerHeight - r.bottom < 300 && r.top > 300);
    setOpen(true);
  };
  const cerrar = () => {
    setOpen(false);
    setActive(-1);
  };
  const elegir = (v: string) => {
    onChange(v);
    cerrar();
  };

  useEffect(() => {
    if (open && active >= 0) (list.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) abrir();
      setActive((a) => Math.min(filtradas.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) abrir();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Home' && open) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End' && open) {
      e.preventDefault();
      setActive(filtradas.length - 1);
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && filtradas[active]) {
        e.preventDefault(); // elegir la opción, no enviar el formulario
        elegir(filtradas[active]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        cerrar();
      }
    } else if (e.key === 'Tab') {
      cerrar();
    }
  };

  return (
    <div
      ref={wrap}
      className={`ui-combo${open ? ' is-open' : ''}`}
      style={maxHeight ? ({ ['--dd-max' as string]: maxHeight } as React.CSSProperties) : undefined}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        cerrar();
        if (!allowCustom && value && !options.some((o) => norm(o) === norm(value))) onChange('');
      }}
    >
      <div className="ui-combo__control">
        <TextInput
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            abrir();
            setActive(0);
          }}
          onFocus={abrir}
          onClick={abrir}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="ui-combo__btn" tabIndex={-1} aria-label={open ? 'Cerrar lista' : 'Ver lista'} onMouseDown={(e) => e.preventDefault()} onClick={() => (open ? cerrar() : abrir())}>
          <Icon name="chevron-down" size={18} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={list}
            id={listId}
            role="listbox"
            data-lenis-prevent
            className={`ui-combo__panel ui-combo__panel--${up ? 'up' : 'down'}`}
            initial={reduce ? false : { opacity: 0, y: up ? 8 : -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: up ? 6 : -6, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: [0.2, 0.7, 0, 1] }}
          >
            {filtradas.length === 0 ? (
              <li className="ui-combo__empty" role="presentation">{allowCustom ? `Se usará «${value.trim()}»` : emptyText}</li>
            ) : (
              filtradas.map((o, i) => (
                <li
                  key={o}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={norm(o) === norm(value)}
                  data-active={i === active}
                  className="ui-combo__opt"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => elegir(o)}
                >
                  <span>{resaltar(o, exacto ? '' : value)}</span>
                  {norm(o) === norm(value) && <Icon name="check" size={16} />}
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
