import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegistrarMisGuiasDialog } from './RegistrarMisGuiasDialog';

// Lista mutable: la creación rápida agrega el nuevo destinatario.
const consignatarios: { id: number; nombre: string }[] = [];

vi.mock('@/hooks/useConsignatarios', () => ({
  useConsignatarios: () => ({ data: consignatarios, isLoading: false }),
}));

// El cliente puede crear destinatarios.
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { hasPermission: (p: string) => boolean }) => unknown) =>
    selector({ hasPermission: () => true }),
}));

vi.mock('@/lib/api/mis-guias.service', () => ({
  registrarMiGuia: vi.fn().mockResolvedValue({ id: 1 }),
}));

vi.mock('@/lib/notify', () => ({
  notify: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), loading: vi.fn(() => 'id') },
}));

// ConsignatarioForm simulado: un botón que "crea" y devuelve el nuevo registro.
vi.mock('@/pages/dashboard/consignatarios/ConsignatarioForm', () => ({
  ConsignatarioForm: ({ onSuccess }: { onSuccess: (c?: { id: number; nombre: string }) => void }) => (
    <button
      type="button"
      onClick={() => {
        const creado = { id: 99, nombre: 'Oficina principal' };
        consignatarios.push(creado);
        onSuccess(creado);
      }}
    >
      simular-crear-destinatario
    </button>
  ),
}));

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RegistrarMisGuiasDialog onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  consignatarios.length = 0;
});
afterEach(cleanup);

describe('RegistrarMisGuiasDialog · creación rápida de destinatario', () => {
  it('crea un destinatario nuevo y lo autoselecciona sin perder el formulario', async () => {
    renderDialog();

    // Sin destinatario seleccionado, la planilla de guías no se muestra todavía.
    expect(screen.queryByText(/¿Tienes varias guías\?/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /agregar nuevo destinatario/i }));
    // El diálogo secundario simulado se monta como hermano del contenido modal,
    // que Radix marca aria-hidden; lo localizamos por texto, no por rol.
    fireEvent.click(await screen.findByText('simular-crear-destinatario'));

    // Autoselección: al quedar elegido el nuevo destinatario, aparece la planilla.
    await waitFor(() => {
      expect(screen.getByText(/¿Tienes varias guías\?/i)).toBeInTheDocument();
    });
  });
});
