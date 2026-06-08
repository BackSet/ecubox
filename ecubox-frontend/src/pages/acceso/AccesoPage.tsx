import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Loader2, LinkIcon, AlertTriangle } from 'lucide-react';
import { canjearAccesoEnlace } from '@/lib/api/auth.service';
import { useAuthStore } from '@/stores/authStore';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { Button } from '@/components/ui/button';

/**
 * Página pública del enlace de acceso. Lee `?token=...`, lo canjea por una
 * sesión de solo lectura (acotada a consignatarios) y entra a las vistas de
 * cliente ya existentes (Mis guías / Mis consignatarios).
 */
export function AccesoPage() {
  const navigate = useNavigate();
  const setAccesoSession = useAuthStore((s) => s.setAccesoSession);
  const [error, setError] = useState<string | null>(null);
  const intentado = useRef(false);

  useEffect(() => {
    if (intentado.current) return;
    intentado.current = true;

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setError('El enlace no es válido: falta el token de acceso.');
      return;
    }

    canjearAccesoEnlace(token)
      .then((data) => {
        setAccesoSession({
          token: data.token,
          nombre: data.resumen.etiqueta?.trim() || 'Mis paquetes',
        });
        navigate({ to: '/mis-guias' });
      })
      .catch((e: unknown) => {
        setError(
          getApiErrorMessage(e) ??
            'El enlace de acceso no es válido, expiró o fue revocado.',
        );
      });
  }, [navigate, setAccesoSession]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        {error ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-warning)]/10">
              <AlertTriangle className="h-6 w-6 text-[var(--color-warning)]" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">No pudimos abrir tu enlace</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Solicita un enlace nuevo a tu operador de ECUBOX.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button asChild variant="secondary">
                <Link to="/tracking">Rastrear un paquete</Link>
              </Button>
              <Button asChild>
                <Link to="/">Ir al inicio</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <LinkIcon className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Abriendo tu acceso…</h1>
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando tu enlace
            </p>
          </>
        )}
      </div>
    </div>
  );
}
