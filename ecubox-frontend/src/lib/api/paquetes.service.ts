import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type {
  Paquete,
  PaqueteCreateRequest,
  PaqueteUpdateRequest,
  PaqueteResumen,
  BandejaPaquete,
  MotivoRevisionPaquete,
  RevisionPaquete,
} from '@/types/paquete';
import type { EstadoRastreo } from '@/types/estado-rastreo';
import type { PageResponse, PageQuery } from '@/types/page';

// Contrato y tipos de dominio difieren en null/optional/required: se conservan
// los tipos de dominio en las firmas y se puentea con casts localizados (body →
// tipo generado, respuesta → tipo de dominio). El payload no cambia.
type S = components['schemas'];

export async function getPaquetes(): Promise<Paquete[]> {
  const data = await unwrap(openapiClient.GET('/api/mis-paquetes'));
  return data as Paquete[];
}

export interface PaqueteListParams extends PageQuery {
  /** código de estado de rastreo */
  estado?: string;
  consignatarioId?: number;
  /** código del envío consolidado */
  envio?: string;
  guiaMasterId?: number;
  /** uno de: 'sin_peso' | 'con_peso' | 'sin_guia_master' | 'vencidos' */
  chip?: string;
  bandeja?: BandejaPaquete;
}

/** Paquetes paginados con búsqueda libre (numeroGuia, ref, contenido, guía master, envío, consignatario) y filtros. */
export async function getPaquetesPaginated(
  params: PaqueteListParams = {},
): Promise<PageResponse<Paquete>> {
  const data = await unwrap(
    openapiClient.GET('/api/mis-paquetes/page', {
      params: {
        query: {
          q: params.q,
          estado: params.estado,
          consignatarioId: params.consignatarioId,
          envio: params.envio,
          guiaMasterId: params.guiaMasterId,
          // Todos los chips (incluido "vencidos") se resuelven server-side: el
          // vencimiento ahora es un predicado SQL sobre fecha_limite_retiro.
          chip: params.chip || undefined,
          bandeja: params.bandeja ?? 'todos',
          page: params.page ?? 0,
          size: params.size ?? 25,
        },
      },
    }),
  );
  return data as PageResponse<Paquete>;
}

export interface PaqueteResumenParams {
  q?: string;
  estado?: string;
  consignatarioId?: number;
  envio?: string;
  guiaMasterId?: number;
  bandeja?: BandejaPaquete;
}

/**
 * Resumen liviano del listado de paquetes: KPIs del universo, conteos por chip
 * (respetando los filtros estructurales) y opciones distintas de filtro. Evita
 * descargar el dataset completo solo para alimentar KPIs, comboboxes y chips.
 */
export async function getPaqueteResumen(params: PaqueteResumenParams = {}): Promise<PaqueteResumen> {
  const data = await unwrap(
    openapiClient.GET('/api/mis-paquetes/resumen', {
      params: {
        query: {
          q: params.q,
          estado: params.estado,
          consignatarioId: params.consignatarioId,
          envio: params.envio,
          guiaMasterId: params.guiaMasterId,
          bandeja: params.bandeja ?? 'todos',
        },
      },
    }),
  );
  return data as PaqueteResumen;
}

export async function createPaquete(body: PaqueteCreateRequest): Promise<Paquete> {
  const data = await unwrap(
    openapiClient.POST('/api/mis-paquetes', { body: body as S['PaqueteCreateRequest'] }),
  );
  return data as Paquete;
}

export async function updatePaquete(id: number, body: PaqueteUpdateRequest): Promise<Paquete> {
  const data = await unwrap(
    openapiClient.PUT('/api/mis-paquetes/{id}', {
      params: { path: { id } },
      body: body as S['PaqueteUpdateRequest'],
    }),
  );
  return data as Paquete;
}

export async function deletePaquete(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE('/api/mis-paquetes/{id}', { params: { path: { id } } }));
}

export async function iniciarRevisionPaquete(
  paqueteId: number,
  body: { motivo: MotivoRevisionPaquete; observacion?: string },
): Promise<RevisionPaquete> {
  const data = await unwrap(
    openapiClient.POST('/api/mis-paquetes/{paqueteId}/revisiones', {
      params: { path: { paqueteId } },
      body: body as S['IniciarRevisionPaqueteRequest'],
    }),
  );
  return data as RevisionPaquete;
}

export async function resolverRevisionPaquete(
  paqueteId: number,
  body: { observacion?: string },
): Promise<RevisionPaquete> {
  const data = await unwrap(
    openapiClient.POST('/api/mis-paquetes/{paqueteId}/revisiones/activa/resolver', {
      params: { path: { paqueteId } },
      body: body as S['ResolverRevisionPaqueteRequest'],
    }),
  );
  return data as RevisionPaquete;
}

export async function getHistorialRevisionPaquete(paqueteId: number): Promise<RevisionPaquete[]> {
  const data = await unwrap(
    openapiClient.GET('/api/mis-paquetes/{paqueteId}/revisiones', {
      params: { path: { paqueteId } },
    }),
  );
  return data as RevisionPaquete[];
}

/** Sugiere una ref única para un paquete (solo admin/operario). */
export async function sugerirRef(
  consignatarioId: number,
  excludePaqueteId?: number,
): Promise<{ ref: string }> {
  const data = await unwrap(
    openapiClient.GET('/api/mis-paquetes/sugerir-ref', {
      params: { query: { consignatarioId, excludePaqueteId } },
    }),
  );
  return data as { ref: string };
}

/** Lista de paquetes para operario (cargar pesos). */
export async function getPaquetesOperario(params?: { sinPeso?: boolean }): Promise<Paquete[]> {
  const sinPeso = params?.sinPeso ?? true;
  const data = await unwrap(
    openapiClient.GET('/api/operario/paquetes', { params: { query: { sinPeso } } }),
  );
  return data as Paquete[];
}

/** Paquetes que superaron el plazo máximo de retiro. */
export async function getPaquetesVencidosOperario(): Promise<Paquete[]> {
  const data = await unwrap(
    openapiClient.GET('/api/operario/paquetes', { params: { query: { vencidos: true } } }),
  );
  return data as Paquete[];
}

/** Paquetes sin saca asignada (disponibles para agregar a una saca). */
export async function getPaquetesSinSaca(): Promise<Paquete[]> {
  const data = await unwrap(
    openapiClient.GET('/api/operario/paquetes', { params: { query: { sinSaca: true } } }),
  );
  return data as Paquete[];
}

/** Asignar o desasignar un paquete a una saca (sacaId null = quitar de saca). */
export async function asignarPaqueteSaca(
  paqueteId: number,
  sacaId: number | null,
): Promise<Paquete> {
  const data = await unwrap(
    openapiClient.PATCH('/api/operario/paquetes/{paqueteId}/saca', {
      params: { path: { paqueteId } },
      body: { sacaId } as S['PaqueteAsignarSacaRequest'],
    }),
  );
  return data as Paquete;
}

export interface PaquetePesoItem {
  paqueteId: number;
  pesoLbs?: number;
  pesoKg?: number;
}

/** Actualizar pesos de varios paquetes a la vez. */
export async function bulkUpdatePesos(items: PaquetePesoItem[]): Promise<Paquete[]> {
  const data = await unwrap(
    openapiClient.POST('/api/operario/paquetes/pesos', {
      body: { items } as S['BulkPaquetePesoRequest'],
    }),
  );
  return data as Paquete[];
}

export interface CambiarEstadoRastreoBulkResponse {
  actualizados: number;
  rechazados: { paqueteId: number; motivo: string }[];
}

/**
 * Estados de rastreo a los que se puede mover la selección de paquetes (intersección
 * válida para todos, calculada por el backend). Para un combobox con solo destinos válidos.
 */
export async function getEstadosDestinoPermitidos(paqueteIds: number[]): Promise<EstadoRastreo[]> {
  const data = await unwrap(
    openapiClient.POST('/api/operario/paquetes/estados-destino-permitidos', {
      body: { paqueteIds } as S['EstadosDestinoPermitidosRequest'],
    }),
  );
  return data as EstadoRastreo[];
}

/** Buscar paquetes por lista de números de guía ECUBOX (operario). */
export async function buscarPaquetesPorGuias(numeroGuias: string[]): Promise<Paquete[]> {
  const data = await unwrap(
    openapiClient.POST('/api/operario/paquetes/buscar-por-guias', {
      body: { numeroGuias } as S['BuscarPaquetesPorGuiasRequest'],
    }),
  );
  return data as Paquete[];
}

/** Aplica un estado de rastreo a todos los paquetes registrados en el periodo. */
export async function aplicarEstadoPorPeriodoPaquetes(params: {
  fechaInicio: string;
  fechaFin: string;
  estadoRastreoId: number;
}): Promise<CambiarEstadoRastreoBulkResponse> {
  const data = await unwrap(
    openapiClient.POST('/api/operario/paquetes/aplicar-estado-por-periodo', {
      body: params as S['AplicarEstadoPorPeriodoPaqueteRequest'],
    }),
  );
  return data as CambiarEstadoRastreoBulkResponse;
}
