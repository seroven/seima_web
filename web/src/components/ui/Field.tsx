// Campo de formulario: etiqueta + control + ayuda/error. El control debe usar el mismo `id`.
import type { ReactNode } from 'react';
import './ui.css';

interface Props {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}

export default function Field({ id, label, hint, error, children }: Props) {
  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && <span className="ui-field__error" role="alert">{error}</span>}
    </div>
  );
}
