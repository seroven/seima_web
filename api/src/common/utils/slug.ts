/** Slug a partir de un nombre (sin tildes, minúsculas, guiones). Quien edita no lo escribe. */
export function slugify(texto: string, opciones: { max?: number; vacio?: string } = {}): string {
  const { max = 110, vacio = 'item' } = opciones;
  const base = texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
  return base || vacio;
}

/** Primer slug libre: `base`, `base-2`, `base-3`… sin pasarse de `max` caracteres. */
export async function slugUnico(base: string, existe: (slug: string) => Promise<boolean>, max: number): Promise<string> {
  if (!(await existe(base))) return base;
  for (let n = 2; n < 1000; n++) {
    const sufijo = `-${n}`;
    const candidato = `${base.slice(0, max - sufijo.length).replace(/-+$/g, '')}${sufijo}`;
    if (!(await existe(candidato))) return candidato;
  }
  throw new Error(`No se encontró un slug libre para "${base}"`);
}
