import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type {
  EnvioConsolidado,
  EnvioConsolidadoCreateRequest,
  EnvioConsolidadoCreateResponse,
  EnvioConsolidadoPaquetesRequest,
  EstadoEnvioConsolidadoOperativo,
  PaqueteElegibleConsolidado,
} from '@/types/envio-consolidado';
import type { PageResponse } from '@/types/page';
import type { EstadoRastreo } from '@/types/estado-rastreo';

// Contrato y tipos de dominio difieren en null/optional/required: se conservan
// los tipos de dominio en las firmas y se puentea con casts localizados (body →
// tipo generado, respuesta → tipo de dominio). El payload no cambia.
type S = components['schemas'];

const BASE = '/api/envios-consolidados' as const;

/** Filtro por estado operativo derivado del consolidado. */
export type EstadoFiltro =
  | 'TODOS'
  | 'VACIO'
  | 'EN_PREPARACION'
  | 'CERRADO'
  | 'ENVIADO_DESDE_USA'
  | 'ARRIBADO_ECUADOR'
  | 'RECIBIDO_EN_BODEGA'
  | 'LIQUIDADO'
  | 'CANCELADO';
export type EstadoPagoFiltro = 'TODOS' | 'PAGADO' | 'NO_PAGADO';

export interface ListarEnviosParams {
  estado?: EstadoFiltro;
  estadoPago?: EstadoPagoFiltro;
  /** Búsqueda libre (LIKE multi-token) sobre el código del envío. */
  q?: string;
  /** Solo consolidados con paquetes que requieren atención (flujo alterno o sin estado). */
  requiereAtencion?: boolean;
  /** Solo consolidados con paquetes en más de un estado actual distinto. */
  estadosMixtos?: boolean;
  page?: number;
  size?: number;
}

export async function listarEnviosConsolidados(
  params: ListarEnviosParams = {},
): Promise<PageResponse<EnvioConsolidado>> {
  const data = await unwrap(openapiClient.GET(BASE, { params: { query: params } }));
  return data as PageResponse<EnvioConsolidado>;
}

export async function listarTodosEnviosConsolidados(): Promise<EnvioConsolidado[]> {
  const consolidados: EnvioConsolidado[] = [];
  let page = 0;
  let totalPages = 1;
  do {
    const respuesta = await listarEnviosConsolidados({
      estado: 'TODOS',
      page,
      size: 100,
    });
    consolidados.push(...respuesta.content);
    totalPages = respuesta.totalPages;
    page += 1;
  } while (page < totalPages);
  return consolidados;
}

export async function listarCandidatosAvanceEstados(): Promise<EnvioConsolidado[]> {
  const data = await unwrap(openapiClient.GET(`${BASE}/candidatos-avance-estados`));
  return data as EnvioConsolidado[];
}

/**
 * Resumen liviano del listado: conteo por estado operativo (KPIs/chips) y por
 * estado de pago. Reemplaza la descarga del dataset completo solo para la
 * cabecera del listado.
 */
export interface EnvioConsolidadoResumen {
  total: number;
  porOperativo: Record<EstadoEnvioConsolidadoOperativo, number>;
  pagados: number;
  noPagados: number;
}

export async function obtenerResumenEnviosConsolidados(): Promise<EnvioConsolidadoResumen> {
  const data = await unwrap(openapiClient.GET(`${BASE}/resumen`));
  return data as EnvioConsolidadoResumen;
}

export interface ListarDisponiblesRecepcionParams {
  /** Búsqueda libre sobre el código del envío. */
  q?: string;
  page?: number;
  size?: number;
}

/**
 * Lista los envíos consolidados que pueden registrarse en un nuevo lote de
 * recepción: SOLO los que están en `ARRIBADO_ECUADOR` (ya arribaron a Ecuador)
 * y aún no fueron recibidos en bodega. La elegibilidad es ortogonal al estado
 * de pago.
 *
 * El backend excluye automáticamente los envíos fuera de `ARRIBADO_ECUADOR`,
 * los que no tienen paquetes y los que ya están en algún otro lote de
 * recepción; al recibirlos quedan en `RECIBIDO_EN_BODEGA`.
 */
export async function listarEnviosDisponiblesParaRecepcion(
  params: ListarDisponiblesRecepcionParams = {},
): Promise<PageResponse<EnvioConsolidado>> {
  const data = await unwrap(
    openapiClient.GET(`${BASE}/disponibles-recepcion`, { params: { query: params } }),
  );
  return data as PageResponse<EnvioConsolidado>;
}

export async function obtenerEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const data = await unwrap(openapiClient.GET(`${BASE}/{id}`, { params: { path: { id } } }));
  return data as EnvioConsolidado;
}

export async function crearEnvioConsolidado(
  body: EnvioConsolidadoCreateRequest,
): Promise<EnvioConsolidadoCreateResponse> {
  const data = await unwrap(
    openapiClient.POST(BASE, { body: body as S['EnvioConsolidadoCreateRequest'] }),
  );
  return data as EnvioConsolidadoCreateResponse;
}

export interface BuscarPaquetesElegiblesParams {
  /** Texto de búsqueda (guía, ref, contenido, guía master, consignatario o consolidado). */
  q?: string;
  page?: number;
  size?: number;
}

/**
 * Busca paquetes para agregarlos a un envío consolidado, indicando la
 * elegibilidad de cada uno (misma regla que la asociación) y el motivo cuando
 * no es elegible. Resultado paginado.
 */
export async function buscarPaquetesElegibles(
  params: BuscarPaquetesElegiblesParams = {},
): Promise<PageResponse<PaqueteElegibleConsolidado>> {
  const data = await unwrap(
    openapiClient.GET(`${BASE}/paquetes-elegibles`, {
      params: {
        query: {
          q: params.q || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      },
    }),
  );
  return data as PageResponse<PaqueteElegibleConsolidado>;
}

/** Cierra un envio consolidado para registro. */
export async function cerrarConsolidadoEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/cerrar-consolidado`, { params: { path: { id } } }),
  );
  return data as EnvioConsolidado;
}

/** Marca un envio consolidado como enviado desde USA. */
export async function enviarDesdeUsaEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/enviar-usa`, { params: { path: { id } } }),
  );
  return data as EnvioConsolidado;
}

/** Registra el arribo del envio consolidado a Ecuador. */
export async function arribarEcuadorEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/arribar-ecuador`, { params: { path: { id } } }),
  );
  return data as EnvioConsolidado;
}

/** Cancela un envio consolidado. */
export async function cancelarEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/cancelar`, { params: { path: { id } } }),
  );
  return data as EnvioConsolidado;
}

/** Revierte la salida USA del consolidado (set fechaCerrado = null). */
export async function reabrirEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/reabrir`, { params: { path: { id } } }),
  );
  return data as EnvioConsolidado;
}

export interface AplicarTransicionConsolidadosPayload {
  estadoOperativoDestino: 'CERRADO' | 'ENVIADO_DESDE_USA' | 'ARRIBADO_ECUADOR' | 'EN_PREPARACION' | 'CANCELADO';
  consolidadoIds?: number[];
  fechaInicio?: string;
  fechaFin?: string;
}

export interface AplicarTransicionConsolidadosResponse {
  consolidadosProcesados: number;
  rechazados: { consolidadoId: number; codigo: string; motivo: string }[];
}

/** Aplica una transición de estado operativo a consolidados (por selección o por periodo). */
export async function aplicarTransicionConsolidados(
  payload: AplicarTransicionConsolidadosPayload,
): Promise<AplicarTransicionConsolidadosResponse> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/aplicar-transicion-operativa`, {
      body: payload as S['AplicarTransicionConsolidadosRequest'],
    }),
  );
  return data as AplicarTransicionConsolidadosResponse;
}

/**
 * Elimina definitivamente un envio consolidado.
 *
 * - {@code eliminarPaquetes=false} (default): los paquetes asociados se
 *   desasocian (FK a null) y siguen existiendo en el sistema.
 * - {@code eliminarPaquetes=true}: los paquetes se eliminan junto con el envio
 *   (irreversible, borra su tracking).
 *
 * Backend valida que el envio no haya salido de USA.
 */
export async function eliminarEnvioConsolidado(
  id: number,
  eliminarPaquetes: boolean = false,
): Promise<void> {
  await ensureOk(
    openapiClient.DELETE(`${BASE}/{id}`, {
      params: { path: { id }, query: { eliminarPaquetes } },
    }),
  );
}

export async function agregarPaquetesEnvioConsolidado(
  id: number,
  body: EnvioConsolidadoPaquetesRequest,
): Promise<EnvioConsolidado> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/paquetes`, {
      params: { path: { id } },
      body: body as S['EnvioConsolidadoPaquetesRequest'],
    }),
  );
  return data as EnvioConsolidado;
}

export async function removerPaquetesEnvioConsolidado(
  id: number,
  body: EnvioConsolidadoPaquetesRequest,
): Promise<EnvioConsolidado> {
  const data = await unwrap(
    openapiClient.DELETE(`${BASE}/{id}/paquetes`, {
      params: { path: { id } },
      body: body as S['EnvioConsolidadoPaquetesRequest'],
    }),
  );
  return data as EnvioConsolidado;
}

export interface AplicarEstadoConsolidadosParams {
  consolidadoIds: number[];
  estadoRastreoId: number;
}

export interface AplicarEstadoConsolidadosResponse {
  consolidadosProcesados: number;
  paquetesActualizados: number;
}

export async function aplicarEstadoEnConsolidados(
  body: AplicarEstadoConsolidadosParams,
): Promise<AplicarEstadoConsolidadosResponse> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/aplicar-estado`, {
      body: body as S['AplicarEstadoEnConsolidadosRequest'],
    }),
  );
  return data as AplicarEstadoConsolidadosResponse;
}

export async function getEstadosAplicablesConsolidados(): Promise<EstadoRastreo[]> {
  const data = await unwrap(openapiClient.GET(`${BASE}/estados-aplicables`));
  return data as EstadoRastreo[];
}

export interface AvanceEstadosConsolidadosPayload {
  consolidadoIds: number[];
  transicionFinalCodigo: string;
  fechaPrincipal: string;
  fechasPorTransicion?: Record<string, string>;
  previewToken?: string;
}

export interface TransicionOperativaConsolidado {
  id: string;
  codigo: string;
  etiqueta: string;
  orden: number | null;
  estadoPrevioRequerido: EstadoEnvioConsolidadoOperativo;
  estadoResultante: EstadoEnvioConsolidadoOperativo;
  estadoAplicadoPaquetes: {
    id: number;
    codigo: string;
    nombre: string;
    orden: number;
  } | null;
  disponible: boolean;
  tipo: 'REQUERIDA' | 'RECOMENDADA';
  requisitos: string[];
  permiso: string;
  problemaConfiguracion?: string | null;
}

export interface PasoAvanceConsolidado {
  transicionCodigo: string;
  transicionEtiqueta: string;
  orden: number;
  fecha: string;
  estadoResultante: EstadoEnvioConsolidadoOperativo;
  estadoAplicadoPaquetes: NonNullable<TransicionOperativaConsolidado['estadoAplicadoPaquetes']>;
  tipo: 'REQUERIDA' | 'RECOMENDADA';
}

export interface AvanceEstadosConsolidadosPreview {
  previewToken: string;
  transicionInicial: TransicionOperativaConsolidado;
  transicionFinal: TransicionOperativaConsolidado;
  pasos: PasoAvanceConsolidado[];
  resumen: {
    totalConsolidados: number;
    totalPaquetes: number;
    totalPasos: number;
    totalEventosPrevistos: number;
  };
  consolidados: Array<{
    id: number;
    codigo: string;
    totalPaquetes: number;
    estadoOperativoActual: EstadoEnvioConsolidadoOperativo;
    estadoOperativoFinal: EstadoEnvioConsolidadoOperativo;
    version: number;
    bloqueos: string[];
  }>;
  bloqueos: string[];
  advertencias: string[];
  valida: boolean;
}

export interface AvanceEstadosConsolidadosResponse {
  consolidadosProcesados: number;
  paquetesProcesados: number;
  transicionesAplicadas: number;
  eventosCreados: number;
  transicionFinalCodigo: string;
  consolidados: Array<{
    id: number;
    codigo: string;
    estadoFinal: EstadoEnvioConsolidadoOperativo;
  }>;
}

export async function getTransicionesOperativasConsolidados(): Promise<TransicionOperativaConsolidado[]> {
  const data = await unwrap(openapiClient.GET(`${BASE}/transiciones-operativas`));
  return data as TransicionOperativaConsolidado[];
}

export async function previewAvanceEstadosConsolidados(
  body: AvanceEstadosConsolidadosPayload,
): Promise<AvanceEstadosConsolidadosPreview> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/preview-secuencia-estados`, {
      body: body as S['AvanceEstadosConsolidadosRequest'],
    }),
  );
  return data as AvanceEstadosConsolidadosPreview;
}

export async function aplicarAvanceEstadosConsolidados(
  body: AvanceEstadosConsolidadosPayload,
): Promise<AvanceEstadosConsolidadosResponse> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/aplicar-secuencia-estados`, {
      body: body as S['AvanceEstadosConsolidadosRequest'],
    }),
  );
  return data as AvanceEstadosConsolidadosResponse;
}

// ---------------------------------------------------------------------------
// Avance automático OPERATIVO (estados del consolidado, NO de rastreo)
// ---------------------------------------------------------------------------

/** Destino operativo del avance automático: CERRADO, ENVIADO_DESDE_USA o ARRIBADO_ECUADOR. */
export type DestinoAvanceOperativoCodigo =
  | 'CERRADO'
  | 'ENVIADO_DESDE_USA'
  | 'ARRIBADO_ECUADOR';

export interface DestinoAvanceOperativo {
  codigo: DestinoAvanceOperativoCodigo;
  nombre: string;
}

export interface PasoAvanceOperativo {
  codigo: EstadoEnvioConsolidadoOperativo;
  nombre: string;
}

export interface AvanceOperativoConsolidadosPayload {
  consolidadoIds: number[];
  estadoOperativoDestino: DestinoAvanceOperativoCodigo;
  previewToken?: string;
}

export interface AvanceOperativoConsolidadosPreview {
  previewToken: string;
  estadoDestino: PasoAvanceOperativo;
  pasos: PasoAvanceOperativo[];
  consolidados: Array<{
    id: number;
    codigo: string;
    estadoOperativoActual: EstadoEnvioConsolidadoOperativo;
    estadoOperativoFinal: EstadoEnvioConsolidadoOperativo;
    pasos: PasoAvanceOperativo[];
    version: number;
  }>;
  resumen: {
    totalConsolidados: number;
    totalPasos: number;
  };
  advertencias: string[];
}

export interface AvanceOperativoConsolidadosResponse {
  consolidadosProcesados: number;
  pasosAplicados: number;
  estadoFinal: string;
  estadoFinalNombre: string;
}

export async function getDestinosAvanceOperativo(): Promise<DestinoAvanceOperativo[]> {
  const data = await unwrap(openapiClient.GET(`${BASE}/destinos-avance-operativo`));
  return data as DestinoAvanceOperativo[];
}

export async function getCandidatosAvanceOperativo(): Promise<EnvioConsolidado[]> {
  const data = await unwrap(openapiClient.GET(`${BASE}/candidatos-avance-operativo`));
  return data as EnvioConsolidado[];
}

export async function previewAvanceOperativoConsolidados(
  body: AvanceOperativoConsolidadosPayload,
): Promise<AvanceOperativoConsolidadosPreview> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/preview-avance-operativo`, {
      body: body as S['AvanceOperativoConsolidadosRequest'],
    }),
  );
  return data as AvanceOperativoConsolidadosPreview;
}

export async function aplicarAvanceOperativoConsolidados(
  body: AvanceOperativoConsolidadosPayload,
): Promise<AvanceOperativoConsolidadosResponse> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/aplicar-avance-operativo`, {
      body: body as S['AvanceOperativoConsolidadosRequest'],
    }),
  );
  return data as AvanceOperativoConsolidadosResponse;
}

/**
 * Ids de consolidados elegibles para aplicar `estadoRastreoId` a sus paquetes:
 * solo los que tienen paquetes en el estado de rastreo inmediatamente
 * anterior (regla de "ir de 1 en 1").
 */
export async function getElegiblesParaEstadoRastreo(estadoRastreoId: number): Promise<number[]> {
  const data = await unwrap(
    openapiClient.GET(`${BASE}/elegibles-para-estado-rastreo`, {
      params: { query: { estadoRastreoId } },
    }),
  );
  return data as number[];
}

export async function descargarManifiestoPdf(id: number): Promise<Blob> {
  return unwrap(
    openapiClient.GET(`${BASE}/{id}/manifiesto.pdf`, {
      params: { path: { id } },
      parseAs: 'blob',
    }),
  );
}

export async function descargarManifiestoXlsx(id: number): Promise<Blob> {
  return unwrap(
    openapiClient.GET(`${BASE}/{id}/manifiesto.xlsx`, {
      params: { path: { id } },
      parseAs: 'blob',
    }),
  );
}
