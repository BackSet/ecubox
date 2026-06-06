import {
  createAgencia,
  deleteAgencia,
  getAgencia,
  getAgencias,
  listarAgenciasPaginado,
  updateAgencia,
} from '@/lib/api/agencias.service';
import type { Agencia, AgenciaRequest } from '@/types/despacho';
import { createCrudQueryHooks } from './createCrudQueryHooks';

export const AGENCIAS_QUERY_KEY = ['agencias'] as const;

const hooks = createCrudQueryHooks<Agencia, AgenciaRequest>({
  queryKey: AGENCIAS_QUERY_KEY,
  api: {
    list: getAgencias,
    listPage: listarAgenciasPaginado,
    get: getAgencia,
    create: createAgencia,
    update: updateAgencia,
    remove: deleteAgencia,
  },
});

export const useAgencias = hooks.useAll;
export const useAgenciasPaginadas = hooks.usePage;
export const useAgencia = hooks.useDetail;
export const useCreateAgencia = hooks.useCreate;
export const useUpdateAgencia = hooks.useUpdate;
export const useDeleteAgencia = hooks.useDelete;
