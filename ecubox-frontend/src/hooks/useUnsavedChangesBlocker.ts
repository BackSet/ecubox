import { useBlocker } from '@tanstack/react-router';

/**
 * Bloqueo de navegación por "cambios sin guardar", unificado para todo el
 * sistema. Bloquea la navegación SPA cuando `isDirty` (para mostrar un diálogo
 * estilizado con `withResolver`) y —clave— **solo habilita el aviso nativo
 * `beforeunload` cuando hay cambios reales**.
 *
 * TanStack dispara el `beforeunload` nativo siempre que exista un blocker
 * registrado y `enableBeforeUnload` sea verdadero (por defecto `true`), SIN
 * consultar `shouldBlockFn`. Pasando `enableBeforeUnload: () => isDirty`
 * evitamos el diálogo nativo espurio (que aparecía al refrescar/cerrar pestaña
 * aunque no hubiera cambios).
 *
 * @returns `{ status, proceed, reset }` para enlazar a {@link UnsavedChangesDialog}.
 */
export function useUnsavedChangesBlocker(isDirty: boolean) {
  return useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: () => isDirty,
    withResolver: true,
  });
}

export type UnsavedChangesBlocker = ReturnType<typeof useUnsavedChangesBlocker>;
