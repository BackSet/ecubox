import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getPaquetes,
  getPaquetesPaginated,
  getPaqueteResumen,
  createPaquete,
  updatePaquete,
  deletePaquete,
  iniciarRevisionPaquete,
  resolverRevisionPaquete,
  getHistorialRevisionPaquete,
  type PaqueteListParams,
  type PaqueteResumenParams,
} from '@/lib/api/paquetes.service';
import type { PaqueteCreateRequest, PaqueteUpdateRequest } from '@/types/paquete';

const QUERY_KEY = ['paquetes'] as const;

export function usePaquetes() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getPaquetes,
  });
}

/** Versión paginada con búsqueda servidor + filtros. Usar para tablas con muchas filas. */
export function usePaquetesPaginated(params: PaqueteListParams) {
  return useQuery({
    queryKey: [
      'paquetes',
      'page',
      params.q ?? '',
      params.estado ?? '',
      params.consignatarioId ?? '',
      params.envio ?? '',
      params.guiaMasterId ?? '',
      params.chip ?? '',
      params.bandeja ?? 'todos',
      params.page ?? 0,
      params.size ?? 25,
    ] as const,
    queryFn: () => getPaquetesPaginated(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Resumen liviano del listado: KPIs, conteos por chip y opciones de filtro.
 * Reemplaza la descarga del dataset completo en {@link usePaquetes} para la
 * vista de listado de Paquetes.
 */
export function usePaqueteResumen(params: PaqueteResumenParams) {
  return useQuery({
    queryKey: [
      'paquetes',
      'resumen',
      params.q ?? '',
      params.estado ?? '',
      params.consignatarioId ?? '',
      params.envio ?? '',
      params.guiaMasterId ?? '',
      params.bandeja ?? 'todos',
    ] as const,
    queryFn: () => getPaqueteResumen(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreatePaquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PaqueteCreateRequest) => createPaquete(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdatePaquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PaqueteUpdateRequest }) =>
      updatePaquete(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeletePaquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePaquete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

function invalidatePaqueteOperations(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: QUERY_KEY });
  qc.invalidateQueries({ queryKey: ['operario'] });
  qc.invalidateQueries({ queryKey: ['envios-consolidados'] });
  qc.invalidateQueries({ queryKey: ['despachos'] });
  qc.invalidateQueries({ queryKey: ['lotes-recepcion'] });
}

export function useIniciarRevisionPaquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paqueteId, body }: {
      paqueteId: number;
      body: Parameters<typeof iniciarRevisionPaquete>[1];
    }) =>
      iniciarRevisionPaquete(paqueteId, body),
    onSuccess: () => invalidatePaqueteOperations(qc),
  });
}

export function useResolverRevisionPaquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paqueteId, body }: { paqueteId: number; body: Parameters<typeof resolverRevisionPaquete>[1] }) =>
      resolverRevisionPaquete(paqueteId, body),
    onSuccess: () => invalidatePaqueteOperations(qc),
  });
}

export function useHistorialRevisionPaquete(paqueteId?: number, enabled = true) {
  return useQuery({
    queryKey: ['paquetes', paqueteId, 'revisiones'],
    queryFn: () => getHistorialRevisionPaquete(paqueteId!),
    enabled: enabled && paqueteId != null,
  });
}
