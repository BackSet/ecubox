import { openapiClient, openapiPublicClient, unwrap } from '@/lib/api/openapi-client';
import {
  normalizeCanalesFromApi,
  type CanalesComunicacion,
  type CanalesComunicacionPublic,
} from '@/types/canales-comunicacion';

export interface MensajeWhatsAppDespacho {
  plantilla: string;
}

export async function getMensajeWhatsAppDespacho(): Promise<MensajeWhatsAppDespacho> {
  const data = await unwrap(openapiClient.GET('/api/operario/config/mensaje-whatsapp-despacho'));
  return { plantilla: data?.plantilla ?? '' };
}

export async function updateMensajeWhatsAppDespacho(body: {
  plantilla: string;
}): Promise<MensajeWhatsAppDespacho> {
  const data = await unwrap(
    openapiClient.PUT('/api/operario/config/mensaje-whatsapp-despacho', { body }),
  );
  return { plantilla: data?.plantilla ?? '' };
}

export interface MensajeAgenciaEeuu {
  mensaje: string;
}

export async function getMensajeAgenciaEeuu(): Promise<MensajeAgenciaEeuu> {
  const data = await unwrap(openapiClient.GET('/api/config/mensaje-agencia-eeuu'));
  return { mensaje: data?.mensaje ?? '' };
}

export async function updateMensajeAgenciaEeuu(body: {
  mensaje: string;
}): Promise<MensajeAgenciaEeuu> {
  const data = await unwrap(
    openapiClient.PUT('/api/operario/config/mensaje-agencia-eeuu', { body }),
  );
  return { mensaje: data?.mensaje ?? '' };
}

export async function getCanalesComunicacionPublic(): Promise<CanalesComunicacionPublic> {
  const data = await unwrap(openapiPublicClient.GET('/api/config/canales-comunicacion'));
  return (data ?? {}) as CanalesComunicacionPublic;
}

export interface TemaTemporadaVentana {
  diasAntes?: number;
  diasDespues?: number;
}

export interface TemaTemporada {
  /** 'auto' | 'off' | id de temporada. */
  override: string;
  /** Ventanas de activación configuradas por id de temporada. */
  ventanas: Record<string, TemaTemporadaVentana>;
}

function normalizeTema(data: Partial<TemaTemporada> | null | undefined): TemaTemporada {
  return {
    override: data?.override ?? 'auto',
    ventanas: data?.ventanas ?? {},
  };
}

export async function getTemaTemporadaPublic(): Promise<TemaTemporada> {
  const data = await unwrap(openapiPublicClient.GET('/api/config/tema-temporada'));
  return normalizeTema(data);
}

export async function getTemaTemporada(): Promise<TemaTemporada> {
  const data = await unwrap(openapiClient.GET('/api/operario/config/tema-temporada'));
  return normalizeTema(data);
}

export async function updateTemaTemporada(body: {
  override: string;
  ventanas: Record<string, TemaTemporadaVentana>;
}): Promise<TemaTemporada> {
  const data = await unwrap(
    openapiClient.PUT('/api/operario/config/tema-temporada', { body }),
  );
  return normalizeTema(data);
}

export async function getCanalesComunicacion(): Promise<CanalesComunicacion> {
  const data = await unwrap(openapiClient.GET('/api/operario/config/canales-comunicacion'));
  // El DTO del contrato tipa los items con campos opcionales; el normalizador
  // tolera ausencias. Cast localizado para puentear la imprecisión.
  return normalizeCanalesFromApi(data as Partial<CanalesComunicacion>);
}

export async function updateCanalesComunicacion(
  body: CanalesComunicacion,
): Promise<CanalesComunicacion> {
  const data = await unwrap(
    openapiClient.PUT('/api/operario/config/canales-comunicacion', { body }),
  );
  return normalizeCanalesFromApi((data ?? body) as Partial<CanalesComunicacion>);
}
