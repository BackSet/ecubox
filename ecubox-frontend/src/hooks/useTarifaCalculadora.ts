import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTarifaCalculadora,
  updateTarifaCalculadora,
} from '@/lib/api/tarifa-calculadora.service';

export const TARIFA_CALCULADORA_QUERY_KEY = ['tarifaCalculadora'] as const;

export function useTarifaCalculadora() {
  return useQuery({
    queryKey: TARIFA_CALCULADORA_QUERY_KEY,
    queryFn: getTarifaCalculadora,
  });
}

export function useUpdateTarifaCalculadora() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { tarifaPorLibra: number }) => updateTarifaCalculadora(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TARIFA_CALCULADORA_QUERY_KEY });
    },
  });
}
