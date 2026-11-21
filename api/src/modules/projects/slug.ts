/** Slug a partir del nombre. Luis no lo escribe. */
export function slugify(titulo: string): string {
  const base = titulo
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110);
  return base || 'proyecto';
}
