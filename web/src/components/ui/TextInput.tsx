// Caja de texto con el estilo de la web. `prefix` (p. ej. "+51") la envuelve en un contenedor con prefijo.
import type { InputHTMLAttributes } from 'react';
import './ui.css';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
}

export default function TextInput({ prefix, className, ...rest }: Props) {
  if (!prefix) return <input {...rest} className={`ui-input${className ? ` ${className}` : ''}`} />;
  return (
    <div className="ui-prefix">
      <span aria-hidden="true">{prefix}</span>
      <input {...rest} className={`ui-input${className ? ` ${className}` : ''}`} />
    </div>
  );
}
