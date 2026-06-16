import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { UnsavedChangesBlocker } from '@/hooks/useUnsavedChangesBlocker';

interface UnsavedChangesDialogProps {
  /** Resultado de `useUnsavedChangesBlocker`. */
  blocker: UnsavedChangesBlocker;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
  /**
   * Acción de confirmar. Por defecto: continuar (descartar cambios y navegar,
   * `proceed`). Sobrescribir, p. ej., para "Guardar y salir" (guarda y luego
   * llama a `proceed`).
   */
  onConfirm?: () => void | Promise<void>;
}

/**
 * Diálogo estilizado de "cambios sin guardar" enlazado a un blocker de
 * navegación (`useUnsavedChangesBlocker`). Reutiliza `ConfirmDialog`. Se abre
 * cuando la navegación queda bloqueada y permite descartar (continuar) o seguir
 * editando (cancelar).
 */
export function UnsavedChangesDialog({
  blocker,
  title = 'Cambios sin guardar',
  description = 'Tienes cambios sin guardar. Si sales ahora, se perderán.',
  confirmLabel = 'Salir sin guardar',
  cancelLabel = 'Seguir editando',
  variant = 'destructive',
  loading,
  onConfirm,
}: UnsavedChangesDialogProps) {
  const { status, proceed, reset } = blocker;
  return (
    <ConfirmDialog
      open={status === 'blocked'}
      onOpenChange={(open) => {
        if (!open) reset?.();
      }}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      variant={variant}
      loading={loading}
      onConfirm={onConfirm ?? (() => proceed?.())}
    />
  );
}
