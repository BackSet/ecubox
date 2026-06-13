import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { aplicarAvanceEstadosConsolidados } from '@/lib/api/envios-consolidados.service';
import { useAplicarAvanceEstadosConsolidados } from './useEnviosConsolidados';

vi.mock('@/lib/api/envios-consolidados.service', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/lib/api/envios-consolidados.service')
  >();
  return {
    ...actual,
    aplicarAvanceEstadosConsolidados: vi.fn(),
  };
});

describe('useAplicarAvanceEstadosConsolidados', () => {
  it('refresca consolidados y paquetes después del éxito', async () => {
    vi.mocked(aplicarAvanceEstadosConsolidados).mockResolvedValue({
      consolidadosProcesados: 1,
      paquetesProcesados: 2,
      transicionesAplicadas: 1,
      eventosCreados: 2,
      transicionFinalCodigo: 'CERRADO',
      consolidados: [{ id: 1, codigo: 'CONS-1', estadoFinal: 'CERRADO' }],
    });
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useAplicarAvanceEstadosConsolidados(), { wrapper });

    await result.current.mutateAsync({
      consolidadoIds: [1],
      transicionFinalCodigo: 'CERRADO',
      fechaPrincipal: '2026-06-12T10:00:00',
      previewToken: 'token',
    });

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['envios-consolidados'] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['paquetes'] });
    });
  });
});
