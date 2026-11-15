// Íconos de línea 24×24 del cotizador (los de ambientes repiten los de CategoryIcon.astro).
interface Props {
  name: string;
  size?: number;
}

export default function Icon({ name, size = 28 }: Props) {
  return (
    <svg className="q-icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === 'cocinas' && (<><path d="M6 3h12l2.5 5h-17z" /><path d="M4 12h16v8H4z" /><path d="M8 16h.01M12 16h.01M16 16h.01" strokeWidth="3" /></>)}
      {name === 'banos' && (<><path d="M3 12h18v2a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" /><path d="M6 12V6a2 2 0 0 1 4 0" /><path d="M6 18l-1 3M18 18l1 3" /></>)}
      {name === 'departamentos' && (<><path d="M5 21V4h10v17" /><path d="M15 9h4v12" /><path d="M3 21h18" /><path d="M8 8h.01M12 8h.01M8 12h.01M12 12h.01M8 16h.01M12 16h.01" strokeWidth="3" /></>)}
      {name === 'melamina' && (<><path d="M5 3h14v17H5z" /><path d="M12 3v17" /><path d="M9.5 11v2.5M14.5 11v2.5" /><path d="M7 20v2M17 20v2" /></>)}
      {name === 'techos' && (<><path d="M3 4h18" /><path d="M12 4v4" /><path d="M8 8h8l2 7H6z" /><path d="M10 18.5h4" /></>)}
      {name === 'remodelaciones' && (<><rect x="4" y="4" width="14" height="5" rx="1.4" /><path d="M18 6.5h2v5H12v3" /><rect x="10" y="14.5" width="4" height="6.5" rx="1" /></>)}
      {name === 'locales' && (<><path d="M3 9l1.5-5h15L21 9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M4.5 12v8h15v-8" /><path d="M10 20v-5h4v5" /></>)}
      {name === 'divisiones' && (<><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M9 4v16M15 4v16" /></>)}
      {name === 'enchapado' && (<><rect x="3.5" y="3.5" width="17" height="17" rx="1.5" /><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" /></>)}
      {name === 'electricidad' && <path d="M13 2 5 13.5h6L10 22l8-11.5h-6z" />}
      {name === 'persona' && (<><path d="M3 11l9-7 9 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></>)}
      {name === 'empresa' && (<><path d="M5 21V3h10v18" /><path d="M15 9h4v12" /><path d="M3 21h18" /><path d="M8 7h.01M12 7h.01M8 11h.01M12 11h.01M8 15h.01M12 15h.01" strokeWidth="3" /></>)}
      {name === 'check' && <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2.6" />}
      {name === 'arrow-right' && <path d="M5 12h14M13 6l6 6-6 6" strokeWidth="2.4" />}
      {name === 'arrow-left' && <path d="M19 12H5M11 6l-6 6 6 6" strokeWidth="2.4" />}
      {name === 'camera' && (<><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></>)}
      {name === 'chevron-up' && <path d="M6 15l6-6 6 6" strokeWidth="2.4" />}
      {name === 'close' && <path d="M6 6l12 12M18 6 6 18" strokeWidth="2.4" />}
    </svg>
  );
}
