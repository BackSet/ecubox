import {
  createAgenciaCourierEntrega,
  deleteAgenciaCourierEntrega,
  getAgenciaCourierEntrega,
  getAgenciasCourierEntregaAll,
  listarAgenciasCourierEntregaPaginado,
  updateAgenciaCourierEntrega,
} from '@/lib/api/puntos-entrega.service';
import type {
  AgenciaCourierEntrega,
  AgenciaCourierEntregaRequest,
} from '@/types/despacho';
import { createCrudQueryHooks } from './createCrudQueryHooks';

export const AGENCIAS_COURIER_ENTREGA_ADMIN_QUERY_KEY = [
  'admin',
  'agencias-courierEntrega',
] as const;

const hooks = createCrudQueryHooks<
  AgenciaCourierEntrega,
  AgenciaCourierEntregaRequest
>({
  queryKey: AGENCIAS_COURIER_ENTREGA_ADMIN_QUERY_KEY,
  api: {
    list: getAgenciasCourierEntregaAll,
    listPage: listarAgenciasCourierEntregaPaginado,
    get: getAgenciaCourierEntrega,
    create: createAgenciaCourierEntrega,
    update: updateAgenciaCourierEntrega,
    remove: deleteAgenciaCourierEntrega,
  },
});

export const usePuntosEntregaAdmin = hooks.useAll;
export const useAgenciasCourierEntregaPaginadas = hooks.usePage;
export const useAgenciaCourierEntregaAdmin = hooks.useDetail;
export const useCreateAgenciaCourierEntrega = hooks.useCreate;
export const useUpdateAgenciaCourierEntrega = hooks.useUpdate;
export const useDeleteAgenciaCourierEntrega = hooks.useDelete;
