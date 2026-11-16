// Caja de texto con el estilo de la web. `prefix` (p. ej. "+51") o `suffix` (p. ej. "m²") la envuelven en un contenedor con ese texto al lado.
import type { InputHTMLAttributes } from 'react';
import './ui.css';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
  suffix?: string;
}

export default function TextInput({ prefix, suffix, className, ...rest }: Props) {
  const clases = `ui-input${className ? ` ${className}` : ''}`;
  if (!prefix && !suffix) return <input {...rest} className={clases} />;
  return (
    <div className="ui-prefix">
      {prefix && <span aria-hidden="true">{prefix}</span>}
      <input {...rest} className={clases} />
      {suffix && <span className="ui-suffix" aria-hidden="true">{suffix}</span>}
    </div>
  );
}
