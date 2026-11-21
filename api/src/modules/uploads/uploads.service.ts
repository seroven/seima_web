import { serviceUnavailable } from '../../common/errors/app-error';
import { env } from '../../config/env';
import { MAX_FOTOS } from '../quotes/quote.constants';
import { signParams } from './cloudinary-signature';

/** Formatos que aceptamos de las fotos del cliente (los iPhone sacan HEIC). */
export const FORMATOS_FOTO = 'jpg,jpeg,png,webp,heic,heif';
/** Tamaño máximo recomendado por foto (la web y la app lo aplican antes de subir). */
export const MAX_BYTES_FOTO = 10 * 1024 * 1024;
/** Video ya recortado y comprimido en el celular. */
export const MAX_BYTES_VIDEO = 50 * 1024 * 1024;
export const FORMATOS_VIDEO = 'mp4,mov,webm';

export interface UploadSignatureDto {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
  signature: string;
  maxFiles: number;
  maxBytes: number;
}

export interface ProjectUploadSignatureDto {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  publicId: string;
  allowedFormats: string;
  signature: string;
  maxBytes: number;
  resourceType: 'image' | 'video';
}

/** Entrega a la web lo necesario para subir las fotos de una cotización directo a Cloudinary. */
export class UploadsService {
  signQuotePhotos(now: number = Date.now()): UploadSignatureDto {
    const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = env;
    if (!cloudName || !apiKey || !secret) {
      throw serviceUnavailable('La subida de fotos no está disponible por ahora');
    }
    const timestamp = Math.floor(now / 1000);
    const folder = env.CLOUDINARY_QUOTES_FOLDER;
    // Los parámetros firmados deben enviarse idénticos a Cloudinary: así no se puede subir a otra carpeta ni con otros formatos
    const signature = signParams({ allowed_formats: FORMATOS_FOTO, folder, timestamp }, secret);
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      cloudName,
      apiKey,
      timestamp,
      folder,
      allowedFormats: FORMATOS_FOTO,
      signature,
      maxFiles: MAX_FOTOS,
      maxBytes: MAX_BYTES_FOTO,
    };
  }

  /** Firma para que la app suba UNA foto o UN video del proyecto a un public_id ya reservado. */
  signProjectMedia(publicId: string, tipo: 'foto' | 'video', now: number = Date.now()): ProjectUploadSignatureDto {
    const creds = this.credenciales();
    const timestamp = Math.floor(now / 1000);
    const allowedFormats = tipo === 'video' ? FORMATOS_VIDEO : FORMATOS_FOTO;
    const resourceType = tipo === 'video' ? 'video' : 'image';
    const signature = signParams({ allowed_formats: allowedFormats, public_id: publicId, timestamp }, creds.secret);
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${creds.cloudName}/${resourceType}/upload`,
      cloudName: creds.cloudName,
      apiKey: creds.apiKey,
      timestamp,
      publicId,
      allowedFormats,
      signature,
      maxBytes: tipo === 'video' ? MAX_BYTES_VIDEO : MAX_BYTES_FOTO,
      resourceType,
    };
  }

  private credenciales() {
    const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = env;
    if (!cloudName || !apiKey || !secret) throw serviceUnavailable('La subida de fotos no está disponible por ahora');
    return { cloudName, apiKey, secret };
  }
}
