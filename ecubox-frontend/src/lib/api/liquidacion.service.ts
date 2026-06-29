import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
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

// Contrato laxo vs tipos de dominio: casts localizados (body → tipo generado,
// respuesta → tipo de dominio). El payload no cambia.
type S = components['schemas'];

const BASE = '/api/liquidaciones' as const;

export async function listarLiquidaciones(
  params: LiquidacionListaParams = {},
): Promise<PageResponse<LiquidacionResumen>> {
  const data = await unwrap(
    openapiClient.GET(BASE, {
      params: {
        query: {
          desdeDocumento: params.desdeDocumento || undefined,
          hastaDocumento: params.hastaDocumento || undefined,
          desdePago: params.desdePago || undefined,
          hastaPago: params.hastaPago || undefined,
          estadoPago: params.estadoPago || undefined,
          q: params.q || undefined,
          page: params.page,
          size: params.size,
        },
      },
    }),
  );
  return data as PageResponse<LiquidacionResumen>;
}

export async function obtenerLiquidacion(id: number): Promise<Liquidacion> {
  const data = await unwrap(openapiClient.GET(`${BASE}/{id}`, { params: { path: { id } } }));
  return data as Liquidacion;
}

export async function crearLiquidacion(body: LiquidacionCrearRequest): Promise<Liquidacion> {
  const data = await unwrap(
    openapiClient.POST(BASE, { body: body as S['LiquidacionCrearRequest'] }),
  );
  return data as Liquidacion;
}

export async function actualizarHeaderLiquidacion(
  id: number,
  body: LiquidacionHeaderRequest,
): Promise<Liquidacion> {
  const data = await unwrap(
    openapiClient.PATCH(`${BASE}/{id}`, {
      params: { path: { id } },
      body: body as S['LiquidacionHeaderRequest'],
    }),
  );
  return data as Liquidacion;
}

export async function eliminarLiquidacion(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE(`${BASE}/{id}`, { params: { path: { id } } }));
}

// --- Sección A ---

export async function agregarConsolidadoLinea(
  id: number,
  body: LiquidacionConsolidadoLineaRequest,
): Promise<Liquidacion> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/consolidados`, {
      params: { path: { id } },
      body: body as S['LiquidacionConsolidadoLineaRequest'],
    }),
  );
  return data as Liquidacion;
}

export async function actualizarConsolidadoLinea(
  id: number,
  lineaId: number,
  body: LiquidacionConsolidadoLineaRequest,
): Promise<Liquidacion> {
  const data = await unwrap(
    openapiClient.PUT(`${BASE}/{id}/consolidados/{lineaId}`, {
      params: { path: { id, lineaId } },
      body: body as S['LiquidacionConsolidadoLineaRequest'],
    }),
  );
  return data as Liquidacion;
}

export async function eliminarConsolidadoLinea(id: number, lineaId: number): Promise<Liquidacion> {
  const data = await unwrap(
    openapiClient.DELETE(`${BASE}/{id}/consolidados/{lineaId}`, {
      params: { path: { id, lineaId } },
    }),
  );
  return data as Liquidacion;
}

// --- Sección B ---

export async function agregarDespachoLinea(
  id: number,
  body: LiquidacionDespachoLineaRequest,
): Promise<Liquidacion> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/despachos`, {
      params: { path: { id } },
      body: body as S['LiquidacionDespachoLineaRequest'],
    }),
  );
  return data as Liquidacion;
}

export async function actualizarDespachoLinea(
  id: number,
  lineaId: number,
  body: LiquidacionDespachoLineaRequest,
): Promise<Liquidacion> {
  const data = await unwrap(
    openapiClient.PUT(`${BASE}/{id}/despachos/{lineaId}`, {
      params: { path: { id, lineaId } },
      body: body as S['LiquidacionDespachoLineaRequest'],
    }),
  );
  return data as Liquidacion;
}

export async function eliminarDespachoLinea(id: number, lineaId: number): Promise<Liquidacion> {
  const data = await unwrap(
    openapiClient.DELETE(`${BASE}/{id}/despachos/{lineaId}`, {
      params: { path: { id, lineaId } },
    }),
  );
  return data as Liquidacion;
}

// --- Pago ---

export async function marcarLiquidacionPagada(id: number): Promise<Liquidacion> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/marcar-pagada`, { params: { path: { id } } }),
  );
  return data as Liquidacion;
}

export async function marcarLiquidacionNoPagada(id: number): Promise<Liquidacion> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/marcar-no-pagada`, { params: { path: { id } } }),
  );
  return data as Liquidacion;
}

// --- Selectores ---

export async function listarConsolidadosDisponibles(
  q: string | undefined,
  page = 0,
  size = 20,
): Promise<PageResponse<EnvioConsolidadoDisponible>> {
  const data = await unwrap(
    openapiClient.GET(`${BASE}/disponibles/consolidados`, {
      params: { query: { q: q || undefined, page, size } },
    }),
  );
  return data as PageResponse<EnvioConsolidadoDisponible>;
}

export async function listarDespachosDisponibles(
  q: string | undefined,
  page = 0,
  size = 20,
): Promise<PageResponse<DespachoDisponible>> {
  const data = await unwrap(
    openapiClient.GET(`${BASE}/disponibles/despachos`, {
      params: { query: { q: q || undefined, page, size } },
    }),
  );
  return data as PageResponse<DespachoDisponible>;
}

// --- Exports ---

export async function descargarLiquidacionPdf(id: number): Promise<Blob> {
  return unwrap(
    openapiClient.GET(`${BASE}/{id}/exportar/pdf`, {
      params: { path: { id } },
      parseAs: 'blob',
    }),
  );
}

export async function descargarLiquidacionXlsx(id: number): Promise<Blob> {
  return unwrap(
    openapiClient.GET(`${BASE}/{id}/exportar/xlsx`, {
      params: { path: { id } },
      parseAs: 'blob',
    }),
  );
}
