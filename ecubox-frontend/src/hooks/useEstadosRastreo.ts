import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  getEstadosRastreo,
  getEstadosRastreoActivos,
  getEstadosRastreoPorPunto,
  updateEstadosRastreoPorPunto,
  createEstadoRastreo,
  updateEstadoRastreo,
  desactivarEstadoRastreo,
  deleteEstadoRastreo,
  reorderTrackingEstadoRastreo,
} from '@/lib/api/estados-rastreo.service';
import type {
  EstadoRastreoOrdenTrackingRequest,
  EstadoRastreoRequest,
  EstadosRastreoPorPuntoRequest,
} from '@/types/estado-rastreo';

export const ESTADOS_RASTREO_QUERY_KEY = ['estados-rastreo'] as const;
export const ESTADOS_RASTREO_POR_PUNTO_QUERY_KEY = [
  'estados-rastreo-por-punto',
] as const;

/** Listas de estados aplicables que dependen de Parámetros → Estados por punto. */
const ESTADOS_APLICABLES_DEPENDIENTES_QUERY_KEYS = [
  ['envios-consolidados', 'estados-aplicables'],
  ['operario', 'despachos', 'estados-aplicables'],
] as const;

function invalidateEstadosAplicablesDependientes(qc: QueryClient) {
  for (const queryKey of ESTADOS_APLICABLES_DEPENDIENTES_QUERY_KEYS) {
    qc.invalidateQueries({ queryKey });
  }
}
export function useEstadosRastreo() {
  return useQuery({
    queryKey: ESTADOS_RASTREO_QUERY_KEY,
    queryFn: getEstadosRastreo,
  });
}

export function useEstadosRastreoActivos() {
  return useQuery({
    queryKey: [...ESTADOS_RASTREO_QUERY_KEY, 'activos'],
    queryFn: getEstadosRastreoActivos,
  });
}

export function useEstadosRastreoPorPunto() {
  return useQuery({
    queryKey: ESTADOS_RASTREO_POR_PUNTO_QUERY_KEY,
    queryFn: getEstadosRastreoPorPunto,
  });
}

export function useUpdateEstadosRastreoPorPunto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EstadosRastreoPorPuntoRequest) =>
      updateEstadosRastreoPorPunto(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ESTADOS_RASTREO_POR_PUNTO_QUERY_KEY });
      invalidateEstadosAplicablesDependientes(qc);
    },
  });
}

export function useCreateEstadoRastreo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EstadoRastreoRequest) => createEstadoRastreo(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ESTADOS_RASTREO_QUERY_KEY });
      invalidateEstadosAplicablesDependientes(qc);
    },
  });
}

export function useUpdateEstadoRastreoEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: EstadoRastreoRequest }) =>
      updateEstadoRastreo(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ESTADOS_RASTREO_QUERY_KEY });
      invalidateEstadosAplicablesDependientes(qc);
    },
  });
}

export function useDesactivarEstadoRastreo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => desactivarEstadoRastreo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ESTADOS_RASTREO_QUERY_KEY });
      invalidateEstadosAplicablesDependientes(qc);
    },
  });
}

export function useDeleteEstadoRastreo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEstadoRastreo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ESTADOS_RASTREO_QUERY_KEY });
      invalidateEstadosAplicablesDependientes(qc);
    },
  });
}

export function useReorderTrackingEstadosRastreo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EstadoRastreoOrdenTrackingRequest) =>
      reorderTrackingEstadoRastreo(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ESTADOS_RASTREO_QUERY_KEY });
      invalidateEstadosAplicablesDependientes(qc);
    },
  });
}
