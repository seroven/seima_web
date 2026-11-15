/** Devuelve el enlace de WhatsApp o null si aún no hay número configurado. */
export function waLink(text: string): string | null {
  const n = import.meta.env.PUBLIC_WHATSAPP_NUMBER;
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
