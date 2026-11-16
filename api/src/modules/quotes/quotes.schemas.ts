import { z } from 'zod';
import { env } from '../../config/env';
import { CLIENTES, MAX_FOTOS, MAX_NOTAS, PLAZO_IDS } from './quote.constants';

const digitos = (s: string) => s.replace(/\D/g, '');
const vacioAUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);
const slug = z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Identificador inválido');

/** Una opción elegida y, si la opción pedía un dato extra, ese dato (texto o número). Se valida de fondo en el servicio. */
const seleccion = z.object({
  opcion: slug,
  valor: z
    .union([z.string().max(300), z.number()])
    .nullish()
    .transform((v) => (v === null || v === undefined || v === '' ? undefined : String(v))),
});

/**
 * Cuerpo de POST /quotes. Mismos campos que arma el cotizador de la web (web/src/lib/quote.ts → submitQuote).
 * Todo lo que llega de la web se trata como no confiable: se valida, se limpia y se acota.
 * Los servicios y las respuestas se comprueban contra el catálogo de la base en el servicio (QuotesService).
 */
export const createQuoteSchema = z
  .object({
    cliente: z.enum(CLIENTES),
    /** slugs de los servicios elegidos (catálogo `services`) */
    servicios: z.array(slug).min(1, 'Elige al menos un servicio').max(10).transform((a) => [...new Set(a)]),
    /**
     * Respuestas por pregunta: la lista de opciones elegidas, cada una con su dato extra si lo pedía.
     * { "mueble-alto": [{ "opcion": "si" }], "area": [{ "opcion": "sabe", "valor": "85" }] }
     */
    respuestas: z.record(slug, z.array(seleccion).min(1).max(20)).default({}),
    distrito: z.string().trim().min(2).max(120),
    plazo: z.enum(PLAZO_IDS),
    /** Datos extra en texto libre (opcional). */
    notas: z.preprocess(vacioAUndefined, z.string().trim().max(MAX_NOTAS, `Máximo ${MAX_NOTAS} caracteres`).optional()),
    /**
     * Fotos ya subidas por el cliente a Cloudinary (public_id). Solo se aceptan ids de la carpeta de cotizaciones:
     * así nadie puede colar en la base una imagen de otra carpeta o de otra cuenta.
     */
    fotos: z
      .array(
        z
          .string()
          .max(150)
          .regex(/^[A-Za-z0-9_/-]+$/, 'Foto inválida')
          .refine((id) => id.startsWith(`${env.CLOUDINARY_QUOTES_FOLDER}/`), 'Foto inválida'),
      )
      .max(MAX_FOTOS, `Máximo ${MAX_FOTOS} fotos`)
      .default([])
      .transform((a) => [...new Set(a)]),
    nombre: z.string().trim().min(2).max(120),
    whatsapp: z
      .string()
      .transform(digitos)
      .pipe(z.string().regex(/^9\d{8}$/, 'Debe ser un celular de 9 dígitos que empiece con 9')),
    razonSocial: z.preprocess(vacioAUndefined, z.string().trim().min(2).max(160).optional()),
    ruc: z.preprocess(
      vacioAUndefined,
      z.string().transform(digitos).pipe(z.string().regex(/^\d{11}$/, 'El RUC tiene 11 dígitos')).optional(),
    ),
    /** Aceptó el tratamiento de sus datos (obligatorio). */
    consentimiento: z.literal(true, { error: 'Debes aceptar el tratamiento de tus datos para enviar la solicitud' }),
    /** Campo trampa: está oculto para las personas; si un robot lo llena, la solicitud se descarta en silencio. */
    website: z.preprocess(vacioAUndefined, z.string().max(200).optional()),
    /** slug del proyecto desde el que se pidió "Cotizar algo así" */
    proyecto: z.preprocess(vacioAUndefined, z.string().max(120).regex(/^[a-z0-9-]+$/).optional()),
  })
  .superRefine((d, ctx) => {
    if (d.cliente === 'empresa' && !d.razonSocial) {
      ctx.addIssue({ code: 'custom', path: ['razonSocial'], message: 'La razón social es obligatoria para empresas' });
    }
  });

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
