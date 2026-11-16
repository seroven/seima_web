// Caja de texto de varias líneas con el estilo de la web (usa los mismos estilos que TextInput).
import type { TextareaHTMLAttributes } from 'react';
import './ui.css';

export default function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`ui-input ui-textarea${className ? ` ${className}` : ''}`} />;
}
