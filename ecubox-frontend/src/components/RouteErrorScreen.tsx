import { RotateCw, TriangleAlert, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isModuleLoadError } from '@/lib/chunkRecovery';

interface RouteErrorScreenProps {
  error: unknown;
}

/**
 * Pantalla de error de ruta para el `defaultErrorComponent` del router.
 *
 * Reemplaza el mensaje crudo de TanStack Router ("Something went wrong! error
 * loading dynamically imported module ...") por un mensaje accionable. Distingue
 * dos casos:
 *  - Chunk obsoleto tras un deploy: el auto-recovery ya intento recargar; si el
 *    usuario llega aqui es porque persiste, asi que le pedimos recargar a mano.
 *  - Cualquier otro error inesperado: recargar o volver al inicio.
 */
export function RouteErrorScreen({ error }: RouteErrorScreenProps) {
  const isChunkError = isModuleLoadError(error);

  const title = isChunkError ? 'Hay una nueva versión disponible' : 'Algo no salió como esperábamos';
  const description = isChunkError
    ? 'Actualizamos ECUBOX mientras navegabas. Recarga la página para cargar la versión más reciente y continuar.'
    : 'Ocurrió un error inesperado al abrir esta sección. Recarga la página; si el problema continúa, vuelve al inicio.';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="surface-card w-full max-w-md p-6 text-center sm:p-8">
        <span
          className={`mx-auto inline-flex size-12 items-center justify-center rounded-full ${
            isChunkError
              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]'
          }`}
        >
          {isChunkError ? (
            <RotateCw className="size-6" aria-hidden />
          ) : (
            <TriangleAlert className="size-6" aria-hidden />
          )}
        </span>

        <h1 className="mt-5 text-lg font-semibold text-[var(--color-foreground)]">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {description}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" className="gap-2" onClick={() => window.location.reload()}>
            <RotateCw className="size-4" aria-hidden />
            Recargar página
          </Button>
          {!isChunkError ? (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              <Home className="size-4" aria-hidden />
              Ir al inicio
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
