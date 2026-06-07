import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTemaTemporada,
  getTemaTemporadaPublic,
  updateTemaTemporada,
  type TemaTemporadaVentana,
} from '@/lib/api/parametros-sistema.service';

export const TEMA_TEMPORADA_QUERY_KEY = ['config', 'tema-temporada'] as const;
export const TEMA_TEMPORADA_PUBLIC_QUERY_KEY = ['config', 'tema-temporada', 'public'] as const;

/** Override del tema para el sitio público (sin autenticación). */
export function useTemaTemporadaPublic(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: TEMA_TEMPORADA_PUBLIC_QUERY_KEY,
    queryFn: getTemaTemporadaPublic,
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/** Override del tema para administración. */
export function useTemaTemporada(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: TEMA_TEMPORADA_QUERY_KEY,
    queryFn: getTemaTemporada,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateTemaTemporada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { override: string; ventanas: Record<string, TemaTemporadaVentana> }) =>
      updateTemaTemporada(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMA_TEMPORADA_QUERY_KEY });
      qc.invalidateQueries({ queryKey: TEMA_TEMPORADA_PUBLIC_QUERY_KEY });
    },
  });
}
