import { z } from 'zod';
import { env } from '../../config/env';
import { ACABADO_IDS, CLIENTES, ESTRUCTURA, MAX_FOTOS, MEDIDAS_MODO, MUEBLE_ALTO, PLAZO_IDS, SERVICIO_IDS } from './quote.constants';

const digitos = (s: string) => s.replace(/\D/g, '');
const vacioAUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

/** Acepta 4, "4", "4,5"; vacío = no enviado. */
const numero = z.preprocess(
  (v) => (typeof v === 'string' ? (v.trim() === '' ? undefined : Number(v.replace(',', '.'))) : vacioAUndefined(v)),
  z.number().positive().max(100000).optional(),
);

/**
 * Cuerpo de POST /quotes. Mismos campos que arma el cotizador de la web (web/src/lib/quote.ts → QuoteData).
 * Todo lo que llega de la web se trata como no confiable: se valida, se limpia y se acota.
 */
export const createQuoteSchema = z
  .object({
    cliente: z.enum(CLIENTES),
    servicios: z.array(z.enum(SERVICIO_IDS)).min(1, 'Elige al menos un servicio').max(10).transform((a) => [...new Set(a)]),
    medidasModo: z.enum(MEDIDAS_MODO).default('nose'),
    largo: numero,
    ancho: numero,
    m2: numero,
    acabado: z.enum(ACABADO_IDS).nullish(),
    muebleAlto: z.enum(MUEBLE_ALTO).nullish(),
    estructura: z.enum(ESTRUCTURA).nullish(),
    ambientes: z.number().int().min(1).max(10).nullish(),
    distrito: z.string().trim().min(2).max(120),
    plazo: z.enum(PLAZO_IDS),
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
