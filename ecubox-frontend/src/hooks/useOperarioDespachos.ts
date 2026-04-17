import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDespachos,
  getDespachoById,
  createDespacho,
  updateDespacho,
  deleteDespacho,
  getMensajeWhatsAppDespacho,
  aplicarEstadoRastreoPorPeriodo,
  getDistribuidores,
  getAgencias,
  getAgenciasDistribuidor,
  createAgenciaDistribuidorOperario,
  getDestinatariosOperario,
  getDestinatarioOperario,
  updateDestinatarioOperario,
  deleteDestinatarioOperario,
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
import type { CreateAgenciaDistribuidorOperarioBody } from '@/lib/api/operario-despachos.service';
import type { DestinatarioFinalRequest } from '@/types/destinatario';

export const DESPACHOS_QUERY_KEY = ['operario', 'despachos'] as const;
export const DISTRIBUIDORES_QUERY_KEY = ['operario', 'distribuidores'] as const;
export const AGENCIAS_QUERY_KEY = ['operario', 'agencias'] as const;
export const AGENCIAS_DISTRIBUIDOR_QUERY_KEY = ['operario', 'agencias-distribuidor'] as const;
export const DESTINATARIOS_OP_QUERY_KEY = ['operario', 'destinatarios'] as const;
export const SACAS_QUERY_KEY = ['operario', 'sacas'] as const;
export const PAQUETES_SIN_SACA_QUERY_KEY = ['operario', 'paquetes', 'sinSaca'] as const;

export function useDespachos() {
  return useQuery({
    queryKey: DESPACHOS_QUERY_KEY,
    queryFn: getDespachos,
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

export function useDistribuidores() {
  return useQuery({
    queryKey: DISTRIBUIDORES_QUERY_KEY,
    queryFn: getDistribuidores,
  });
}

export function useAgenciasOperario() {
  return useQuery({
    queryKey: AGENCIAS_QUERY_KEY,
    queryFn: getAgencias,
  });
}

export function useAgenciasDistribuidor(distribuidorId: number | undefined | null) {
  return useQuery({
    queryKey: [...AGENCIAS_DISTRIBUIDOR_QUERY_KEY, distribuidorId],
    queryFn: () => getAgenciasDistribuidor(distribuidorId!),
    enabled: distribuidorId != null && !Number.isNaN(distribuidorId),
  });
}

export function useCreateAgenciaDistribuidorOperario(distribuidorId: number | undefined | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAgenciaDistribuidorOperarioBody) =>
      createAgenciaDistribuidorOperario(distribuidorId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AGENCIAS_DISTRIBUIDOR_QUERY_KEY });
    },
  });
}

export function useDestinatariosOperario(search?: string, enabled = true) {
  return useQuery({
    queryKey: [...DESTINATARIOS_OP_QUERY_KEY, search ?? ''],
    queryFn: () => getDestinatariosOperario({ search: search ?? undefined }),
    enabled,
  });
}

export function useDestinatarioOperario(id: number | undefined | null) {
  return useQuery({
    queryKey: [...DESTINATARIOS_OP_QUERY_KEY, id],
    queryFn: () => getDestinatarioOperario(id!),
    enabled: id != null,
  });
}

export function useUpdateDestinatarioOperario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: DestinatarioFinalRequest }) =>
      updateDestinatarioOperario(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: DESTINATARIOS_OP_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...DESTINATARIOS_OP_QUERY_KEY, id] });
    },
  });
}

export function useDeleteDestinatarioOperario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDestinatarioOperario(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DESTINATARIOS_OP_QUERY_KEY });
    },
  });
}

export function useSacasOperario(sinDespacho = true) {
  return useQuery({
    queryKey: [...SACAS_QUERY_KEY, { sinDespacho }],
    queryFn: () => getSacasOperario({ sinDespacho }),
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

export function usePaquetesSinSaca() {
  return useQuery({
    queryKey: PAQUETES_SIN_SACA_QUERY_KEY,
    queryFn: getPaquetesSinSaca,
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
