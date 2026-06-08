import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAccesoEnlaces,
  generarAccesoEnlace,
  revocarAccesoEnlace,
} from '@/lib/api/acceso-enlaces.service';
import type { GenerarAccesoEnlaceRequest } from '@/types/acceso-enlace';

export const ACCESO_ENLACES_QUERY_KEY = ['acceso-enlaces'] as const;

export function useAccesoEnlaces(enabled = true) {
  return useQuery({
    queryKey: ACCESO_ENLACES_QUERY_KEY,
    queryFn: getAccesoEnlaces,
    enabled,
  });
}

export function useGenerarAccesoEnlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerarAccesoEnlaceRequest) => generarAccesoEnlace(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACCESO_ENLACES_QUERY_KEY });
    },
  });
}

export function useRevocarAccesoEnlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => revocarAccesoEnlace(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACCESO_ENLACES_QUERY_KEY });
    },
  });
}
