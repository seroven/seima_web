// Contador − n + (p. ej. número de ambientes).
import './ui.css';

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export default function Stepper({ value, onChange, min = 1, max = 10, label = 'cantidad' }: Props) {
  return (
    <div className="ui-stepper">
      <button type="button" aria-label={`Menos ${label}`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={`Más ${label}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
    </div>
  );
}
