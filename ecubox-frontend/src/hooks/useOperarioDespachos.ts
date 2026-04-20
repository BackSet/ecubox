import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getDespachos,
  getDespachosPaginado,
  getDespachoById,
  createDespacho,
  updateDespacho,
  deleteDespacho,
  getMensajeWhatsAppDespacho,
  aplicarEstadoRastreoPorPeriodo,
  aplicarEstadoRastreoEnDespachos,
  getEstadosAplicablesDespacho,
  getCouriersEntrega,
  getAgencias,
  getAgenciasCourierEntrega,
  createAgenciaCourierEntregaOperario,
  getConsignatariosOperario,
  getConsignatarioOperario,
  updateConsignatarioOperario,
  deleteConsignatarioOperario,
  getSacasOperario,
  createSaca,
  actualizarTamanioSaca,
  asignarPaquetesASaca,
} from '@/lib/api/operario-despachos.service';
import {
  getPaquetesSinSaca,
  asignarPaqueteSaca,
} from '@/lib/api/paquetes.service';
import type { DespachoCreateRequest, SacaCreateRequest, TamanioSaca } from '@/types/despacho';
import type { CreateAgenciaCourierEntregaOperarioBody } from '@/lib/api/operario-despachos.service';
import type { ConsignatarioRequest } from '@/types/consignatario';
import type { PageQuery } from '@/types/page';

export const DESPACHOS_QUERY_KEY = ['operario', 'despachos'] as const;
export const COURIERS_ENTREGA_QUERY_KEY = ['operario', 'couriersEntrega'] as const;
export const AGENCIAS_QUERY_KEY = ['operario', 'agencias'] as const;
export const AGENCIAS_COURIER_ENTREGA_QUERY_KEY = ['operario', 'agencias-courierEntrega'] as const;
export const CONSIGNATARIOS_OP_QUERY_KEY = ['operario', 'consignatarios'] as const;
export const SACAS_QUERY_KEY = ['operario', 'sacas'] as const;
export const PAQUETES_SIN_SACA_QUERY_KEY = ['operario', 'paquetes', 'sinSaca'] as const;

export function useDespachos() {
  return useQuery({
    queryKey: DESPACHOS_QUERY_KEY,
    queryFn: getDespachos,
  });
}

/** Versión paginada con búsqueda servidor. */
export function useDespachosPaginados(params: PageQuery) {
  return useQuery({
    queryKey: [
      ...DESPACHOS_QUERY_KEY,
      'page',
      params.q ?? '',
      params.page ?? 0,
      params.size ?? 25,
    ] as const,
    queryFn: () => getDespachosPaginado(params),
    placeholderData: keepPreviousData,
  });
}

export function useDespacho(id: number | undefined) {
  return useQuery({
    queryKey: [...DESPACHOS_QUERY_KEY, id],
    queryFn: () => getDespachoById(id!),
    enabled: id != null && !Number.isNaN(id),
  });
}

export function useCreateDespacho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DespachoCreateRequest) => createDespacho(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DESPACHOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: SACAS_QUERY_KEY });
    },
  });
}

export function useUpdateDespacho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: DespachoCreateRequest }) =>
      updateDespacho(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: DESPACHOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...DESPACHOS_QUERY_KEY, id] });
      qc.invalidateQueries({ queryKey: SACAS_QUERY_KEY });
    },
  });
}

export function useDeleteDespacho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDespacho(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DESPACHOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: SACAS_QUERY_KEY });
    },
  });
}

export function useMensajeWhatsAppDespachoGenerado(despachoId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...DESPACHOS_QUERY_KEY, 'mensaje-whatsapp', despachoId],
    queryFn: () => getMensajeWhatsAppDespacho(despachoId!),
    enabled: enabled && despachoId != null && !Number.isNaN(despachoId),
  });
}

export function useAplicarEstadoPorPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      fechaInicio: string;
      fechaFin: string;
      estadoRastreoId?: number;
    }) => aplicarEstadoRastreoPorPeriodo(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DESPACHOS_QUERY_KEY });
    },
  });
}

export function useAplicarEstadoEnDespachos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      despachoIds: number[];
      estadoRastreoId?: number;
    }) => aplicarEstadoRastreoEnDespachos(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DESPACHOS_QUERY_KEY });
    },
  });
}

export function useEstadosAplicablesDespacho(enabled = true) {
  return useQuery({
    queryKey: [...DESPACHOS_QUERY_KEY, 'estados-aplicables'],
    queryFn: getEstadosAplicablesDespacho,
    enabled,
    staleTime: 60_000,
  });
}

export function useCouriersEntrega() {
  return useQuery({
    queryKey: COURIERS_ENTREGA_QUERY_KEY,
    queryFn: getCouriersEntrega,
  });
}

export function useAgenciasOperario() {
  return useQuery({
    queryKey: AGENCIAS_QUERY_KEY,
    queryFn: getAgencias,
  });
}

export function useAgenciasCourierEntrega(courierEntregaId: number | undefined | null) {
  return useQuery({
    queryKey: [...AGENCIAS_COURIER_ENTREGA_QUERY_KEY, courierEntregaId],
    queryFn: () => getAgenciasCourierEntrega(courierEntregaId!),
    enabled: courierEntregaId != null && !Number.isNaN(courierEntregaId),
  });
}

export function useCreateAgenciaCourierEntregaOperario(courierEntregaId: number | undefined | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAgenciaCourierEntregaOperarioBody) =>
      createAgenciaCourierEntregaOperario(courierEntregaId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AGENCIAS_COURIER_ENTREGA_QUERY_KEY });
    },
  });
}

export function useConsignatariosOperario(search?: string, enabled = true) {
  return useQuery({
    queryKey: [...CONSIGNATARIOS_OP_QUERY_KEY, search ?? ''],
    queryFn: () => getConsignatariosOperario({ search: search ?? undefined }),
    enabled,
  });
}

export function useConsignatarioOperario(id: number | undefined | null) {
  return useQuery({
    queryKey: [...CONSIGNATARIOS_OP_QUERY_KEY, id],
    queryFn: () => getConsignatarioOperario(id!),
    enabled: id != null,
  });
}

export function useUpdateConsignatarioOperario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ConsignatarioRequest }) =>
      updateConsignatarioOperario(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: CONSIGNATARIOS_OP_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...CONSIGNATARIOS_OP_QUERY_KEY, id] });
    },
  });
}

export function useDeleteConsignatarioOperario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteConsignatarioOperario(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONSIGNATARIOS_OP_QUERY_KEY });
    },
  });
}

export function useSacasOperario(sinDespacho = true, enabled = true) {
  return useQuery({
    queryKey: [...SACAS_QUERY_KEY, { sinDespacho }],
    queryFn: () => getSacasOperario({ sinDespacho }),
    enabled,
  });
}

export function useCreateSaca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SacaCreateRequest) => createSaca(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SACAS_QUERY_KEY });
    },
  });
}

export function useActualizarTamanioSaca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sacaId,
      tamanio,
    }: {
      sacaId: number;
      tamanio: TamanioSaca;
    }) => actualizarTamanioSaca(sacaId, tamanio),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DESPACHOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: SACAS_QUERY_KEY });
    },
  });
}

export function usePaquetesSinSaca(enabled = true) {
  return useQuery({
    queryKey: PAQUETES_SIN_SACA_QUERY_KEY,
    queryFn: getPaquetesSinSaca,
    enabled,
  });
}

export function useAsignarPaqueteSaca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      paqueteId,
      sacaId,
    }: {
      paqueteId: number;
      sacaId: number | null;
    }) => asignarPaqueteSaca(paqueteId, sacaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DESPACHOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: SACAS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: PAQUETES_SIN_SACA_QUERY_KEY });
    },
  });
}

export function useAsignarPaquetesASaca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sacaId,
      paqueteIds,
    }: {
      sacaId: number;
      paqueteIds: number[];
    }) => asignarPaquetesASaca(sacaId, paqueteIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DESPACHOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: SACAS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: PAQUETES_SIN_SACA_QUERY_KEY });
    },
  });
}
