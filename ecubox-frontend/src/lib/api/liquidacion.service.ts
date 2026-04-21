import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  DespachoDisponible,
  EnvioConsolidadoDisponible,
  Liquidacion,
  LiquidacionConsolidadoLineaRequest,
  LiquidacionCrearRequest,
  LiquidacionDespachoLineaRequest,
  LiquidacionHeaderRequest,
  LiquidacionListaParams,
  LiquidacionResumen,
} from '@/types/liquidacion';
import type { PageResponse } from '@/types/page';

const BASE = API_ENDPOINTS.liquidaciones;

function buildListParams(params: LiquidacionListaParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (params.desdeDocumento) out.desdeDocumento = params.desdeDocumento;
  if (params.hastaDocumento) out.hastaDocumento = params.hastaDocumento;
  if (params.desdePago) out.desdePago = params.desdePago;
  if (params.hastaPago) out.hastaPago = params.hastaPago;
  if (params.estadoPago) out.estadoPago = params.estadoPago;
  if (params.q) out.q = params.q;
  if (params.page !== undefined) out.page = params.page;
  if (params.size !== undefined) out.size = params.size;
  return out;
}

export async function listarLiquidaciones(
  params: LiquidacionListaParams = {},
): Promise<PageResponse<LiquidacionResumen>> {
  const { data } = await apiClient.get<PageResponse<LiquidacionResumen>>(BASE, {
    params: buildListParams(params),
  });
  return data;
}

export async function obtenerLiquidacion(id: number): Promise<Liquidacion> {
  const { data } = await apiClient.get<Liquidacion>(`${BASE}/${id}`);
  return data;
}

export async function crearLiquidacion(body: LiquidacionCrearRequest): Promise<Liquidacion> {
  const { data } = await apiClient.post<Liquidacion>(BASE, body);
  return data;
}

export async function actualizarHeaderLiquidacion(
  id: number,
  body: LiquidacionHeaderRequest,
): Promise<Liquidacion> {
  const { data } = await apiClient.patch<Liquidacion>(`${BASE}/${id}`, body);
  return data;
}

export async function eliminarLiquidacion(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

// --- Sección A ---

export async function agregarConsolidadoLinea(
  id: number,
  body: LiquidacionConsolidadoLineaRequest,
): Promise<Liquidacion> {
  const { data } = await apiClient.post<Liquidacion>(`${BASE}/${id}/consolidados`, body);
  return data;
}

export async function actualizarConsolidadoLinea(
  id: number,
  lineaId: number,
  body: LiquidacionConsolidadoLineaRequest,
): Promise<Liquidacion> {
  const { data } = await apiClient.put<Liquidacion>(
    `${BASE}/${id}/consolidados/${lineaId}`,
    body,
  );
  return data;
}

export async function eliminarConsolidadoLinea(
  id: number,
  lineaId: number,
): Promise<Liquidacion> {
  const { data } = await apiClient.delete<Liquidacion>(`${BASE}/${id}/consolidados/${lineaId}`);
  return data;
}

// --- Sección B ---

export async function agregarDespachoLinea(
  id: number,
  body: LiquidacionDespachoLineaRequest,
): Promise<Liquidacion> {
  const { data } = await apiClient.post<Liquidacion>(`${BASE}/${id}/despachos`, body);
  return data;
}

export async function actualizarDespachoLinea(
  id: number,
  lineaId: number,
  body: LiquidacionDespachoLineaRequest,
): Promise<Liquidacion> {
  const { data } = await apiClient.put<Liquidacion>(`${BASE}/${id}/despachos/${lineaId}`, body);
  return data;
}

export async function eliminarDespachoLinea(
  id: number,
  lineaId: number,
): Promise<Liquidacion> {
  const { data } = await apiClient.delete<Liquidacion>(`${BASE}/${id}/despachos/${lineaId}`);
  return data;
}

// --- Pago ---

export async function marcarLiquidacionPagada(id: number): Promise<Liquidacion> {
  const { data } = await apiClient.post<Liquidacion>(`${BASE}/${id}/marcar-pagada`);
  return data;
}

export async function marcarLiquidacionNoPagada(id: number): Promise<Liquidacion> {
  const { data } = await apiClient.post<Liquidacion>(`${BASE}/${id}/marcar-no-pagada`);
  return data;
}

// --- Selectores ---

export async function listarConsolidadosDisponibles(
  q: string | undefined,
  page = 0,
  size = 20,
): Promise<PageResponse<EnvioConsolidadoDisponible>> {
  const { data } = await apiClient.get<PageResponse<EnvioConsolidadoDisponible>>(
    `${BASE}/disponibles/consolidados`,
    { params: { q: q || undefined, page, size } },
  );
  return data;
}

export async function listarDespachosDisponibles(
  q: string | undefined,
  page = 0,
  size = 20,
): Promise<PageResponse<DespachoDisponible>> {
  const { data } = await apiClient.get<PageResponse<DespachoDisponible>>(
    `${BASE}/disponibles/despachos`,
    { params: { q: q || undefined, page, size } },
  );
  return data;
}

// --- Exports ---

export async function descargarLiquidacionPdf(id: number): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`${BASE}/${id}/exportar/pdf`, {
    responseType: 'blob',
  });
  return data;
}

export async function descargarLiquidacionXlsx(id: number): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`${BASE}/${id}/exportar/xlsx`, {
    responseType: 'blob',
  });
  return data;
}
