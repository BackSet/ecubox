import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actualizarMiGuia,
  actualizarMiGuiaConsignatario,
  eliminarMiGuia,
  listarMisGuias,
  obtenerMiGuia,
  listarPiezasDeMiGuia,
  registrarMiGuia,
  obtenerMiInicioDashboard,
  type MiGuiaUpdateBody,
} from '@/lib/api/mis-guias.service';
import type { MiGuiaCreateRequest } from '@/types/guia-master';

export const MIS_GUIAS_QUERY_KEY = ['mis-guias'] as const;

export function useMisGuias() {
  return useQuery({
    queryKey: [...MIS_GUIAS_QUERY_KEY, 'list'],
    queryFn: () => listarMisGuias(),
  });
}

export function useMiGuia(id: number | null | undefined) {
  return useQuery({
    queryKey: [...MIS_GUIAS_QUERY_KEY, 'detail', id],
    queryFn: () => obtenerMiGuia(id as number),
    enabled: id != null,
  });
}

export function useMiGuiaPiezas(id: number | null | undefined) {
  return useQuery({
    queryKey: [...MIS_GUIAS_QUERY_KEY, 'piezas', id],
    queryFn: () => listarPiezasDeMiGuia(id as number),
    enabled: id != null,
  });
}

export function useRegistrarMiGuia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MiGuiaCreateRequest) => registrarMiGuia(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MIS_GUIAS_QUERY_KEY });
    },
  });
}

export function useActualizarMiGuiaConsignatario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      consignatarioId,
    }: {
      id: number;
      consignatarioId: number;
    }) => actualizarMiGuiaConsignatario(id, consignatarioId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MIS_GUIAS_QUERY_KEY });
    },
  });
}

export function useActualizarMiGuia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: MiGuiaUpdateBody }) =>
      actualizarMiGuia(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MIS_GUIAS_QUERY_KEY });
    },
  });
}

export function useEliminarMiGuia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => eliminarMiGuia(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MIS_GUIAS_QUERY_KEY });
    },
  });
}

export function useMiInicioDashboard() {
  return useQuery({
    queryKey: [...MIS_GUIAS_QUERY_KEY, 'dashboard'],
    queryFn: () => obtenerMiInicioDashboard(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
