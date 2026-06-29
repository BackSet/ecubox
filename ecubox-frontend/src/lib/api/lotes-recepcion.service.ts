import { openapiClient, unwrap } from '@/lib/api/openapi-client';
import type { LoteRecepcion, LoteRecepcionCreateRequest } from '@/types/lote-recepcion';
import type { PageResponse } from '@/types/page';

export async function getLotesRecepcion(): Promise<LoteRecepcion[]> {
  const data = await unwrap(openapiClient.GET('/api/operario/lotes-recepcion'));
  return data as LoteRecepcion[];
}

export interface LoteRecepcionListParams {
  /** Búsqueda libre: #, observaciones, operario o número de guía. */
  q?: string;
  /** Nombre exacto de operario. */
  operario?: string;
  /** Rango de fechas (inclusive), formato yyyy-MM-dd. */
  desde?: string;
  hasta?: string;
  page?: number;
  size?: number;
}

export async function getLotesRecepcionPaginated(
  params: LoteRecepcionListParams = {},
): Promise<PageResponse<LoteRecepcion>> {
  const data = await unwrap(
    openapiClient.GET('/api/operario/lotes-recepcion/page', { params: { query: params } }),
  );
  return data as PageResponse<LoteRecepcion>;
}

/** Resumen liviano del listado: KPIs y operarios distintos para el filtro. */
export interface LoteRecepcionResumen {
  total: number;
  paquetes: number;
  guiasUnicas: number;
  hoy: number;
  operarios: string[];
}

export async function getLoteRecepcionResumen(): Promise<LoteRecepcionResumen> {
  const data = await unwrap(openapiClient.GET('/api/operario/lotes-recepcion/resumen'));
  return data as LoteRecepcionResumen;
}

export async function getLoteRecepcionById(id: number): Promise<LoteRecepcion> {
  const data = await unwrap(
    openapiClient.GET('/api/operario/lotes-recepcion/{id}', { params: { path: { id } } }),
  );
  return data as LoteRecepcion;
}

export async function createLoteRecepcion(
  body: LoteRecepcionCreateRequest,
): Promise<LoteRecepcion> {
  const data = await unwrap(openapiClient.POST('/api/operario/lotes-recepcion', { body }));
  return data as LoteRecepcion;
}

export async function addGuiasToLoteRecepcion(
  id: number,
  numeroGuiasEnvio: string[],
): Promise<LoteRecepcion> {
  const data = await unwrap(
    openapiClient.POST('/api/operario/lotes-recepcion/{id}/guias', {
      params: { path: { id } },
      body: { numeroGuiasEnvio },
    }),
  );
  return data as LoteRecepcion;
}

export interface DeleteLoteRecepcionResponse {
  paquetesRevertidos: number;
}

export async function deleteLoteRecepcion(id: number): Promise<DeleteLoteRecepcionResponse> {
  // El contrato tipa la respuesta como mapa genérico (Map<String,Integer>); el
  // backend devuelve { paquetesRevertidos }. Se construye el objeto de dominio.
  const data = await unwrap(
    openapiClient.DELETE('/api/operario/lotes-recepcion/{id}', { params: { path: { id } } }),
  );
  return { paquetesRevertidos: data.paquetesRevertidos ?? 0 };
}
