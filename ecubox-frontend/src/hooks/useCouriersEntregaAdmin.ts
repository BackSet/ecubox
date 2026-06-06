import {
  createCourierEntrega,
  deleteCourierEntrega,
  getCourierEntregaAdmin,
  getCouriersEntregaAdmin,
  listarCouriersEntregaPaginado,
  updateCourierEntrega,
} from '@/lib/api/couriers-entrega.service';
import type { CourierEntrega, CourierEntregaRequest } from '@/types/despacho';
import { createCrudQueryHooks } from './createCrudQueryHooks';

export const COURIERS_ENTREGA_ADMIN_QUERY_KEY = ['couriersEntrega'] as const;

const hooks = createCrudQueryHooks<CourierEntrega, CourierEntregaRequest>({
  queryKey: COURIERS_ENTREGA_ADMIN_QUERY_KEY,
  api: {
    list: getCouriersEntregaAdmin,
    listPage: listarCouriersEntregaPaginado,
    get: getCourierEntregaAdmin,
    create: createCourierEntrega,
    update: updateCourierEntrega,
    remove: deleteCourierEntrega,
  },
});

export const useCouriersEntregaAdmin = hooks.useAll;
export const useCouriersEntregaPaginados = hooks.usePage;
export const useCourierEntregaAdmin = hooks.useDetail;
export const useCreateCourierEntrega = hooks.useCreate;
export const useUpdateCourierEntrega = hooks.useUpdate;
export const useDeleteCourierEntrega = hooks.useDelete;
