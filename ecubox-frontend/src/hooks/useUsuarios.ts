import {
  createUsuario,
  deleteUsuario,
  getUsuario,
  getUsuarios,
  listarUsuariosPaginado,
  updateUsuario,
} from '@/lib/api/usuario.service';
import type {
  UsuarioCreateRequest,
  UsuarioDTO,
  UsuarioUpdateRequest,
} from '@/types/usuario';
import { createCrudQueryHooks } from './createCrudQueryHooks';

const QUERY_KEY = ['usuarios'] as const;

const hooks = createCrudQueryHooks<
  UsuarioDTO,
  UsuarioCreateRequest,
  UsuarioUpdateRequest
>({
  queryKey: QUERY_KEY,
  api: {
    list: getUsuarios,
    listPage: listarUsuariosPaginado,
    get: getUsuario,
    create: createUsuario,
    update: updateUsuario,
    remove: deleteUsuario,
  },
});

export const useUsuarios = hooks.useAll;
export const useUsuariosPaginados = hooks.usePage;
export const useUsuario = hooks.useDetail;
export const useCreateUsuario = hooks.useCreate;
export const useUpdateUsuario = hooks.useUpdate;
export const useDeleteUsuario = hooks.useDelete;
