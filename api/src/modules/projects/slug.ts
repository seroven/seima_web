import { slugify as slugBase } from '../../common/utils/slug';

/** Slug a partir del nombre. Luis no lo escribe. */
export const slugify = (titulo: string): string => slugBase(titulo, { max: 110, vacio: 'proyecto' });
