import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type {
  Agencia,
  AgenciaCourierEntrega,
  Despacho,
  DespachoCreateRequest,
  CourierEntrega,
  Saca,
  SacasElegiblesDespacho,
  SacaCreateRequest,
  TamanioSaca,
  TipoEntrega,
} from '@/types/despacho';
import type { Consignatario, ConsignatarioRequest } from '@/types/consignatario';
import type { UsuarioDTO } from '@/types/usuario';
import type { EstadoRastreo } from '@/types/estado-rastreo';
import type { Paquete } from '@/types/paquete';
import type { PageResponse, PageQuery } from '@/types/page';

// Contrato laxo vs tipos de dominio: casts localizados (body → tipo generado,
// respuesta → tipo de dominio). El payload no cambia.
type S = components['schemas'];

const DIST = '/api/operario/couriers-entrega' as const;
const AGENCIAS = '/api/operario/agencias' as const;
const DEST = '/api/operario/consignatarios' as const;
const SACAS = '/api/operario/sacas' as const;
const DESPACHOS = '/api/operario/despachos' as const;

export async function getCouriersEntrega(): Promise<CourierEntrega[]> {
  const data = await unwrap(openapiClient.GET(DIST));
  return data as CourierEntrega[];
}

export async function getAgencias(): Promise<Agencia[]> {
  const data = await unwrap(openapiClient.GET(AGENCIAS));
  return data as Agencia[];
}

export async function getAgenciasCourierEntrega(
  courierEntregaId: number,
): Promise<AgenciaCourierEntrega[]> {
  const data = await unwrap(
    openapiClient.GET(`${DIST}/{courierEntregaId}/puntos-entrega`, {
      params: { path: { courierEntregaId } },
    }),
  );
  return data as AgenciaCourierEntrega[];
}

/**
 * Crear punto de entrega de un courier desde el flujo operario.
 * Sin nombre, sin código y sin tarifa: el costo lo maneja Liquidaciones.
 */
export interface CreateAgenciaCourierEntregaOperarioBody {
  provincia?: string;
  canton?: string;
  direccion?: string;
  horarioAtencion?: string;
  diasMaxRetiro?: number;
}

export async function createAgenciaCourierEntregaOperario(
  courierEntregaId: number,
  body: CreateAgenciaCourierEntregaOperarioBody,
): Promise<AgenciaCourierEntrega> {
  const data = await unwrap(
    openapiClient.POST(`${DIST}/{courierEntregaId}/puntos-entrega`, {
      params: { path: { courierEntregaId } },
      body: body as S['AgenciaCourierEntregaCreateOperarioRequest'],
    }),
  );
  return data as AgenciaCourierEntrega;
}

export async function getConsignatariosOperario(params?: {
  search?: string;
}): Promise<Consignatario[]> {
  const data = await unwrap(
    openapiClient.GET(DEST, { params: { query: { search: params?.search } } }),
  );
  return data as Consignatario[];
}

export async function getConsignatarioOperario(id: number): Promise<Consignatario> {
  const data = await unwrap(openapiClient.GET(`${DEST}/{id}`, { params: { path: { id } } }));
  return data as Consignatario;
}

export async function getClientesOperario(): Promise<UsuarioDTO[]> {
  const data = await unwrap(openapiClient.GET(`${DEST}/clientes`));
  return data as UsuarioDTO[];
}

export async function createConsignatarioOperario(
  body: ConsignatarioRequest,
): Promise<Consignatario> {
  const data = await unwrap(
    openapiClient.POST(DEST, { body: body as S['ConsignatarioRequest'] }),
  );
  return data as Consignatario;
}

export async function asignarConsignatariosClienteOperario(body: {
  clienteUsuarioId: number;
  consignatarioIds: number[];
}): Promise<Consignatario[]> {
  const data = await unwrap(
    openapiClient.PATCH(`${DEST}/asignar-cliente`, {
      body: body as S['AsignarConsignatariosClienteRequest'],
    }),
  );
  return data as Consignatario[];
}

export async function updateConsignatarioOperario(
  id: number,
  body: ConsignatarioRequest,
): Promise<Consignatario> {
  const data = await unwrap(
    openapiClient.PUT(`${DEST}/{id}`, {
      params: { path: { id } },
      body: body as S['ConsignatarioRequest'],
    }),
  );
  return data as Consignatario;
}

export async function deleteConsignatarioOperario(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE(`${DEST}/{id}`, { params: { path: { id } } }));
}

export async function getSacasOperario(params?: { sinDespacho?: boolean }): Promise<Saca[]> {
  const sinDespacho = params?.sinDespacho ?? true;
  const data = await unwrap(
    openapiClient.GET(SACAS, { params: { query: { sinDespacho } } }),
  );
  return data as Saca[];
}

export async function getSacasElegiblesDespacho(): Promise<SacasElegiblesDespacho> {
  const data = await unwrap(openapiClient.GET(`${DESPACHOS}/sacas-elegibles`));
  return data as SacasElegiblesDespacho;
}

export async function createSaca(body: SacaCreateRequest): Promise<Saca> {
  const data = await unwrap(openapiClient.POST(SACAS, { body: body as S['SacaCreateRequest'] }));
  return data as Saca;
}

export async function actualizarTamanioSaca(sacaId: number, tamanio: TamanioSaca): Promise<Saca> {
  const data = await unwrap(
    openapiClient.PATCH(`${SACAS}/{id}/tamanio`, {
      params: { path: { id: sacaId } },
      body: { tamanio } as S['SacaActualizarTamanioRequest'],
    }),
  );
  return data as Saca;
}

/** Asignar varios paquetes a una saca. */
export async function asignarPaquetesASaca(
  sacaId: number,
  paqueteIds: number[],
): Promise<Paquete[]> {
  const data = await unwrap(
    openapiClient.POST(`${SACAS}/{sacaId}/paquetes`, {
      params: { path: { sacaId } },
      body: { paqueteIds } as S['SacaAsignarPaquetesRequest'],
    }),
  );
  return data as Paquete[];
}

export async function getDespachos(): Promise<Despacho[]> {
  const data = await unwrap(openapiClient.GET(DESPACHOS));
  return data as Despacho[];
}

export interface DespachoListParams extends PageQuery {
  /** Filtro por tipo de entrega. */
  tipo?: TipoEntrega;
  /** Nombre exacto del courier de entrega. */
  courier?: string;
  /** Rango de fechas (inclusive), formato yyyy-MM-dd. */
  desde?: string;
  hasta?: string;
}

/** Listado paginado con búsqueda libre + filtros (tipo, courier, rango de fechas). */
export async function getDespachosPaginado(
  params: DespachoListParams = {},
): Promise<PageResponse<Despacho>> {
  const data = await unwrap(
    openapiClient.GET(`${DESPACHOS}/page`, {
      params: {
        query: {
          q: params.q,
          tipo: params.tipo,
          courier: params.courier,
          desde: params.desde,
          hasta: params.hasta,
          page: params.page ?? 0,
          size: params.size ?? 25,
        },
      },
    }),
  );
  return data as PageResponse<Despacho>;
}

/** Resumen liviano del listado: KPIs, conteos por tipo (respetando courier/período) y filtros. */
export interface DespachoResumen {
  total: number;
  hoy: number;
  ultimos7d: number;
  sacas: number;
  couriersEntrega: number;
  tipoCountsTotal: number;
  tipoCounts: Partial<Record<TipoEntrega, number>>;
  couriers: string[];
  tipos: TipoEntrega[];
}

export interface DespachoResumenParams {
  courier?: string;
  desde?: string;
  hasta?: string;
}

export async function getDespachoResumen(
  params: DespachoResumenParams = {},
): Promise<DespachoResumen> {
  const data = await unwrap(
    openapiClient.GET(`${DESPACHOS}/resumen`, {
      params: { query: { courier: params.courier, desde: params.desde, hasta: params.hasta } },
    }),
  );
  return data as DespachoResumen;
}

/** Despacho por ID con sacas y paquetes (para ver/imprimir). */
export async function getDespachoById(id: number): Promise<Despacho> {
  const data = await unwrap(openapiClient.GET(`${DESPACHOS}/{id}`, { params: { path: { id } } }));
  return data as Despacho;
}

export async function createDespacho(body: DespachoCreateRequest): Promise<Despacho> {
  const data = await unwrap(
    openapiClient.POST(DESPACHOS, { body: body as S['DespachoCreateRequest'] }),
  );
  return data as Despacho;
}

export async function updateDespacho(id: number, body: DespachoCreateRequest): Promise<Despacho> {
  const data = await unwrap(
    openapiClient.PUT(`${DESPACHOS}/{id}`, {
      params: { path: { id } },
      body: body as S['DespachoCreateRequest'],
    }),
  );
  return data as Despacho;
}

export async function deleteDespacho(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE(`${DESPACHOS}/{id}`, { params: { path: { id } } }));
}

export async function getMensajeWhatsAppDespacho(despachoId: number): Promise<{ mensaje: string }> {
  const data = await unwrap(
    openapiClient.GET(`${DESPACHOS}/{id}/mensaje-whatsapp`, {
      params: { path: { id: despachoId } },
    }),
  );
  return data as { mensaje: string };
}

export interface AplicarEstadoPorPeriodoParams {
  fechaInicio: string;
  fechaFin: string;
  estadoRastreoId?: number;
}

export interface AplicarEstadoPorPeriodoResponse {
  despachosProcesados: number;
  paquetesActualizados: number;
}

/** Aplica el estado de rastreo (o el configurado en parámetros) a todos los paquetes de despachos en el periodo. */
export async function aplicarEstadoRastreoPorPeriodo(
  params: AplicarEstadoPorPeriodoParams,
): Promise<AplicarEstadoPorPeriodoResponse> {
  const data = await unwrap(
    openapiClient.POST(`${DESPACHOS}/aplicar-estado-por-periodo`, {
      body: {
        fechaInicio: params.fechaInicio,
        fechaFin: params.fechaFin,
        estadoRastreoId: params.estadoRastreoId ?? null,
      } as S['AplicarEstadoPorPeriodoRequest'],
    }),
  );
  return data as AplicarEstadoPorPeriodoResponse;
}

export interface AplicarEstadoEnDespachosParams {
  despachoIds: number[];
  estadoRastreoId?: number;
}

/** Aplica el estado de rastreo a los paquetes de los despachos indicados (uno o varios). */
export async function aplicarEstadoRastreoEnDespachos(
  params: AplicarEstadoEnDespachosParams,
): Promise<AplicarEstadoPorPeriodoResponse> {
  const data = await unwrap(
    openapiClient.POST(`${DESPACHOS}/aplicar-estado-en-despachos`, {
      body: {
        despachoIds: params.despachoIds,
        estadoRastreoId: params.estadoRastreoId ?? null,
      } as S['AplicarEstadoEnDespachosRequest'],
    }),
  );
  return data as AplicarEstadoPorPeriodoResponse;
}

/** Estados activos posteriores al "estado del punto de despacho", aplicables masivamente. */
export async function getEstadosAplicablesDespacho(): Promise<EstadoRastreo[]> {
  const data = await unwrap(openapiClient.GET(`${DESPACHOS}/estados-aplicables`));
  return data as EstadoRastreo[];
}
