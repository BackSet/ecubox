import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type { PageQuery, PageResponse } from '@/types/page';

interface CrudQueryApi<TEntity, TCreate, TUpdate> {
  list: () => Promise<TEntity[]>;
  listPage: (params: PageQuery) => Promise<PageResponse<TEntity>>;
  get: (id: number) => Promise<TEntity>;
  create: (body: TCreate) => Promise<TEntity>;
  update: (id: number, body: TUpdate) => Promise<TEntity>;
  remove: (id: number) => Promise<void>;
}

interface CrudQueryConfig<TEntity, TCreate, TUpdate> {
  queryKey: QueryKey;
  api: CrudQueryApi<TEntity, TCreate, TUpdate>;
}

export function buildPageQueryKey(queryKey: QueryKey, params: PageQuery): QueryKey {
  return [
    ...queryKey,
    'page',
    params.q ?? '',
    params.page ?? 0,
    params.size ?? 25,
  ];
}

export function createCrudQueryHooks<TEntity, TCreate, TUpdate = TCreate>({
  queryKey,
  api,
}: CrudQueryConfig<TEntity, TCreate, TUpdate>) {
  function useAll() {
    return useQuery({
      queryKey,
      queryFn: api.list,
    });
  }

  function usePage(params: PageQuery = {}) {
    return useQuery({
      queryKey: buildPageQueryKey(queryKey, params),
      queryFn: () => api.listPage(params),
      placeholderData: keepPreviousData,
    });
  }

  function useDetail(id: number | undefined | null) {
    return useQuery({
      queryKey: [...queryKey, id],
      queryFn: () => api.get(id!),
      enabled: id != null && Number.isFinite(id),
    });
  }

  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: api.create,
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: number; body: TUpdate }) =>
        api.update(id, body),
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: [...queryKey, id] });
      },
    });
  }

  function useDelete() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: api.remove,
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });
  }

  return { useAll, usePage, useDetail, useCreate, useUpdate, useDelete };
}
