import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type {
  EstadoGuiaMaster,
  GuiaMaster,
  GuiaMasterCancelarRequest,
  GuiaMasterCreateRequest,
  GuiaMasterUpdateRequest,
  GuiaMasterCerrarConFaltanteRequest,
  GuiaMasterConfirmarDespachoParcialRequest,
  GuiaMasterDashboard,
  GuiaMasterEstadoHistorial,
  GuiaMasterReabrirRequest,
  GuiaMasterRevisionRequest,
} from '@/types/guia-master';
import type { Paquete } from '@/types/paquete';
import type { PageResponse, PageQuery } from '@/types/page';

// Contrato y tipos de dominio difieren en null/optional/required: se conservan
// los tipos de dominio en las firmas y se puentea con casts localizados (body →
// tipo generado, respuesta → tipo de dominio). El payload no cambia.
type S = components['schemas'];

export async function listarGuiasMaster(
  trackingBase?: string,
  estados?: EstadoGuiaMaster[],
): Promise<GuiaMaster[]> {
  // NOTA (bug latente preservado): el backend nombra el parámetro `estado`
  // (`@RequestParam(name="estado") List<String>`), pero este endpoint históricamente
  // envía `estados` (plural), por lo que el filtro por estado se ignora aquí. Se
  // conserva el request de red EXACTO para no cambiar comportamiento en esta
  // migración; corregir el nombre del parámetro es un cambio funcional aparte.
  const query: Record<string, string> = {};
  if (trackingBase) query.trackingBase = trackingBase;
  if (estados && estados.length > 0) query.estados = estados.join(',');
  // El cast permite enviar la clave `estados` (fuera del contrato, que define
  // `estado`) preservando el request histórico; el serializador la incluye igual.
  const data = await unwrap(
    openapiClient.GET('/api/guias-master', {
      params: { query: query as unknown as { trackingBase?: string; estado?: string[] } },
    }),
  );
  return data as GuiaMaster[];
}

export interface ListarGuiasMasterPageParams extends PageQuery {
  estados?: EstadoGuiaMaster[];
}

/** Listado paginado con búsqueda libre (trackingBase, consignatario, cliente). */
export async function listarGuiasMasterPaginado(
  params: ListarGuiasMasterPageParams = {},
): Promise<PageResponse<GuiaMaster>> {
  const data = await unwrap(
    openapiClient.GET('/api/guias-master/page', {
      params: {
        query: {
          q: params.q,
          // `estado` es multivalor (List<String>); el querySerializer global lo
          // emite como `estado=a,b`, idéntico al request anterior.
          estado: params.estados && params.estados.length > 0 ? params.estados : undefined,
          page: params.page ?? 0,
          size: params.size ?? 25,
        },
      },
    }),
  );
  return data as PageResponse<GuiaMaster>;
}

export async function obtenerGuiaMaster(id: number): Promise<GuiaMaster> {
  const data = await unwrap(openapiClient.GET('/api/guias-master/{id}', { params: { path: { id } } }));
  return data as GuiaMaster;
}

export async function listarPiezasDeGuiaMaster(id: number): Promise<Paquete[]> {
  const data = await unwrap(
    openapiClient.GET('/api/guias-master/{id}/piezas', { params: { path: { id } } }),
  );
  return data as Paquete[];
}

export async function crearGuiaMaster(body: GuiaMasterCreateRequest): Promise<GuiaMaster> {
  const data = await unwrap(
    openapiClient.POST('/api/guias-master', { body: body as S['GuiaMasterCreateRequest'] }),
  );
  return data as GuiaMaster;
}

export async function actualizarGuiaMaster(
  id: number,
  body: GuiaMasterUpdateRequest,
): Promise<GuiaMaster> {
  const data = await unwrap(
    openapiClient.PATCH('/api/guias-master/{id}', {
      params: { path: { id } },
      body: body as S['GuiaMasterUpdateRequest'],
    }),
  );
  return data as GuiaMaster;
}

export async function eliminarGuiaMaster(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE('/api/guias-master/{id}', { params: { path: { id } } }));
}

export async function cerrarGuiaMasterConFaltante(
  id: number,
  body: GuiaMasterCerrarConFaltanteRequest,
): Promise<GuiaMaster> {
  const data = await unwrap(
    openapiClient.POST('/api/guias-master/{id}/cerrar-con-faltante', {
      params: { path: { id } },
      body: body as S['GuiaMasterCerrarConFaltanteRequest'],
    }),
  );
  return data as GuiaMaster;
}

export async function confirmarDespachoParcialGuiaMaster(
  id: number,
  body: GuiaMasterConfirmarDespachoParcialRequest,
): Promise<GuiaMaster> {
  const data = await unwrap(
    openapiClient.POST('/api/guias-master/{id}/confirmar-despacho-parcial', {
      params: { path: { id } },
      body: body as S['GuiaMasterConfirmarDespachoParcialRequest'],
    }),
  );
  return data as GuiaMaster;
}

export async function obtenerDashboardGuiasMaster(topAntiguas = 10): Promise<GuiaMasterDashboard> {
  const data = await unwrap(
    openapiClient.GET('/api/guias-master/dashboard', { params: { query: { topAntiguas } } }),
  );
  return data as GuiaMasterDashboard;
}

export async function aprobarGuiaMaster(id: number): Promise<GuiaMaster> {
  const data = await unwrap(
    openapiClient.POST('/api/guias-master/{id}/aprobar', { params: { path: { id } } }),
  );
  return data as GuiaMaster;
}

export async function cancelarGuiaMaster(
  id: number,
  body: GuiaMasterCancelarRequest,
): Promise<GuiaMaster> {
  const data = await unwrap(
    openapiClient.POST('/api/guias-master/{id}/cancelar', {
      params: { path: { id } },
      body: body as S['GuiaMasterCancelarRequest'],
    }),
  );
  return data as GuiaMaster;
}

export async function marcarGuiaMasterEnRevision(
  id: number,
  body: GuiaMasterRevisionRequest,
): Promise<GuiaMaster> {
  const data = await unwrap(
    openapiClient.POST('/api/guias-master/{id}/marcar-en-revision', {
      params: { path: { id } },
      body: body as S['GuiaMasterRevisionRequest'],
    }),
  );
  return data as GuiaMaster;
}

export async function salirGuiaMasterDeRevision(
  id: number,
  body: GuiaMasterRevisionRequest,
): Promise<GuiaMaster> {
  const data = await unwrap(
    openapiClient.POST('/api/guias-master/{id}/salir-de-revision', {
      params: { path: { id } },
      body: body as S['GuiaMasterRevisionRequest'],
    }),
  );
  return data as GuiaMaster;
}

export async function reabrirGuiaMaster(
  id: number,
  body: GuiaMasterReabrirRequest,
): Promise<GuiaMaster> {
  const data = await unwrap(
    openapiClient.POST('/api/guias-master/{id}/reabrir', {
      params: { path: { id } },
      body: body as S['GuiaMasterReabrirRequest'],
    }),
  );
  return data as GuiaMaster;
}

export async function recalcularGuiaMaster(id: number): Promise<GuiaMaster> {
  const data = await unwrap(
    openapiClient.POST('/api/guias-master/{id}/recalcular', { params: { path: { id } } }),
  );
  return data as GuiaMaster;
}

export async function listarHistorialGuiaMaster(id: number): Promise<GuiaMasterEstadoHistorial[]> {
  const data = await unwrap(
    openapiClient.GET('/api/guias-master/{id}/historial', { params: { path: { id } } }),
  );
  return data as GuiaMasterEstadoHistorial[];
}

export interface AplicarAccionGuiasMasterPayload {
  accion: string;
  guiaIds: number[];
  motivo?: string;
}

export interface AplicarAccionGuiasMasterResponse {
  procesadas: number;
  rechazados: { guiaMasterId: number; trackingBase: string; motivo: string }[];
}

/**
 * Aplica una acción de ciclo de vida a varias guías master en una sola
 * llamada; las no elegibles vuelven como rechazadas con su motivo.
 */
export async function aplicarAccionBulkGuiasMaster(
  payload: AplicarAccionGuiasMasterPayload,
): Promise<AplicarAccionGuiasMasterResponse> {
  const data = await unwrap(
    openapiClient.POST('/api/guias-master/aplicar-accion', {
      body: payload as S['AplicarAccionGuiasMasterRequest'],
    }),
  );
  return data as AplicarAccionGuiasMasterResponse;
}
