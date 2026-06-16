import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actualizarCampania,
  crearCampania,
  desactivarCampania,
  eliminarCampania,
  getCampaniaLandingPublic,
  listarCampanias,
  obtenerCampania,
  publicarCampania,
} from '@/lib/api/campania-landing.service';
import type { CampaniaLandingRequest } from '@/types/campania-landing';

export const CAMPANIAS_LANDING_QUERY_KEY = ['campanias-landing'] as const;
export const CAMPANIA_LANDING_PUBLIC_QUERY_KEY = ['campania-landing', 'public'] as const;

/** Campaña pública vigente para el sitio público (sin autenticación). */
export function useCampaniaLandingPublic(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CAMPANIA_LANDING_PUBLIC_QUERY_KEY,
    queryFn: getCampaniaLandingPublic,
    staleTime: 60 * 1000,
    // La landing no debe romperse si la API falla: no reintentar agresivamente.
    retry: false,
    enabled: options?.enabled ?? true,
  });
}

export function useCampaniasLanding(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CAMPANIAS_LANDING_QUERY_KEY,
    queryFn: listarCampanias,
    enabled: options?.enabled ?? true,
  });
}

export function useCampaniaLanding(id: number | null | undefined) {
  return useQuery({
    queryKey: [...CAMPANIAS_LANDING_QUERY_KEY, id],
    queryFn: () => obtenerCampania(id as number),
    enabled: id != null,
  });
}

function useInvalidarCampanias() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: CAMPANIAS_LANDING_QUERY_KEY });
    qc.invalidateQueries({ queryKey: CAMPANIA_LANDING_PUBLIC_QUERY_KEY });
  };
}

export function useCrearCampania() {
  const invalidar = useInvalidarCampanias();
  return useMutation({
    mutationFn: (body: CampaniaLandingRequest) => crearCampania(body),
    onSuccess: invalidar,
  });
}

export function useActualizarCampania() {
  const invalidar = useInvalidarCampanias();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CampaniaLandingRequest }) =>
      actualizarCampania(id, body),
    onSuccess: invalidar,
  });
}

export function usePublicarCampania() {
  const invalidar = useInvalidarCampanias();
  return useMutation({
    mutationFn: (id: number) => publicarCampania(id),
    onSuccess: invalidar,
  });
}

export function useDesactivarCampania() {
  const invalidar = useInvalidarCampanias();
  return useMutation({
    mutationFn: (id: number) => desactivarCampania(id),
    onSuccess: invalidar,
  });
}

export function useEliminarCampania() {
  const invalidar = useInvalidarCampanias();
  return useMutation({
    mutationFn: (id: number) => eliminarCampania(id),
    onSuccess: invalidar,
  });
}
