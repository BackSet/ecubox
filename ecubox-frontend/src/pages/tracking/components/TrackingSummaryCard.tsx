import {
  AlertTriangle,
  CheckCircle2,
  Hash,
  PackageCheck,
  RefreshCcw,
  Truck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { TrackingResponse } from '@/lib/api/tracking.service';

interface TrackingSummaryCardProps {
  result: TrackingResponse;
  fechaFormateada: string | null;
  /** Porcentaje de avance 0-100 (solo etapas base). */
  progress: number;
  pasoBaseActual: number;
  totalPasosBase: number;
}

type HeroTone = 'info' | 'success' | 'warning' | 'danger';

interface HeroVisual {
  tone: HeroTone;
  icon: ReactNode;
  /** Texto corto que precede al estado, p. ej. "Tu envío está". */
  kicker: string;
}

/**
 * Resuelve el "tono" visual del héroe a partir del estado del envío. La idea es
 * que el cliente entienda de un vistazo si todo va bien (info/success), si debe
 * prestar atención (warning) o si hay un problema de plazo (danger).
 */
function resolveHeroVisual(
  result: TrackingResponse,
  completo: boolean,
): HeroVisual {
  if (result.paqueteVencido) {
    return {
      tone: 'danger',
      icon: <AlertTriangle className="h-7 w-7" />,
      kicker: 'Atención con tu envío',
    };
  }
  if (result.flujoActual === 'ALTERNO') {
    return {
      tone: 'warning',
      icon: <RefreshCcw className="h-7 w-7" />,
      kicker: 'Rastreo especial',
    };
  }
  if (completo) {
    return {
      tone: 'success',
      icon: <PackageCheck className="h-7 w-7" />,
      kicker: 'Tu envío está',
    };
  }
  return {
    tone: 'info',
    icon: <Truck className="h-7 w-7" />,
    kicker: 'Tu envío está',
  };
}

const TONE_STYLES: Record<
  HeroTone,
  { band: string; icon: string; bar: string; barTrack: string; percent: string }
> = {
  info: {
    band: 'bg-[color-mix(in_oklab,var(--color-info)_9%,var(--color-card))]',
    icon: 'bg-[color-mix(in_oklab,var(--color-info)_16%,transparent)] text-[var(--color-info)]',
    bar: 'bg-[var(--color-info)]',
    barTrack: 'bg-[color-mix(in_oklab,var(--color-info)_14%,var(--color-muted))]',
    percent: 'text-[var(--color-info)]',
  },
  success: {
    band: 'bg-[color-mix(in_oklab,var(--color-success)_10%,var(--color-card))]',
    icon: 'bg-[color-mix(in_oklab,var(--color-success)_16%,transparent)] text-[var(--color-success)]',
    bar: 'bg-[var(--color-success)]',
    barTrack: 'bg-[color-mix(in_oklab,var(--color-success)_14%,var(--color-muted))]',
    percent: 'text-[var(--color-success)]',
  },
  warning: {
    band: 'bg-[color-mix(in_oklab,var(--color-warning)_11%,var(--color-card))]',
    icon: 'bg-[color-mix(in_oklab,var(--color-warning)_18%,transparent)] text-[var(--color-warning)]',
    bar: 'bg-[var(--color-warning)]',
    barTrack: 'bg-[color-mix(in_oklab,var(--color-warning)_14%,var(--color-muted))]',
    percent: 'text-[var(--color-warning)]',
  },
  danger: {
    band: 'bg-[color-mix(in_oklab,var(--color-destructive)_10%,var(--color-card))]',
    icon: 'bg-[color-mix(in_oklab,var(--color-destructive)_16%,transparent)] text-[var(--color-destructive)]',
    bar: 'bg-[var(--color-destructive)]',
    barTrack: 'bg-[color-mix(in_oklab,var(--color-destructive)_14%,var(--color-muted))]',
    percent: 'text-[var(--color-destructive)]',
  },
};

export function TrackingSummaryCard({
  result,
  fechaFormateada,
  progress,
  pasoBaseActual,
  totalPasosBase,
}: TrackingSummaryCardProps) {
  const estadoTexto = result.estadoRastreoNombre ?? 'Estado no disponible';
  const completo = totalPasosBase > 0 && pasoBaseActual >= totalPasosBase;
  const visual = resolveHeroVisual(result, completo);
  const styles = TONE_STYLES[visual.tone];
  const progressRedondeado = Math.round(progress);

  // Mensaje bajo el estado: leyenda configurada del estado actual en
  // /parametros-sistema → estados. Si el backend no la trae a nivel raíz,
  // caemos a la leyenda del estado marcado como actual en el catálogo.
  const leyendaActual =
    result.leyenda ??
    result.estados?.find((e) => e.esActual)?.leyenda ??
    null;

  return (
    <section className="surface-card overflow-hidden">
      {/* Banda protagonista: estado del envío grande y claro */}
      <div className={`${styles.band} p-5 sm:p-6`}>
        <div className="flex items-start gap-4">
          <span
            className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}
            aria-hidden
          >
            {visual.icon}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {visual.kicker}
            </p>
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-[var(--color-foreground)] sm:text-[1.75rem]">
              {estadoTexto}
            </h2>
            {leyendaActual ? (
              <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {leyendaActual}
              </p>
            ) : null}
          </div>
        </div>

        {/* Barra de avance: el cliente ve cuánto falta de un vistazo */}
        <div className="mt-5 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              {totalPasosBase > 0 ? (
                <>
                  Paso {pasoBaseActual} de {totalPasosBase}
                </>
              ) : (
                'Avance del envío'
              )}
            </p>
            <p className={`text-sm font-bold tabular-nums ${styles.percent}`}>
              {progressRedondeado}%
            </p>
          </div>
          <div
            className={`h-2.5 w-full overflow-hidden rounded-full ${styles.barTrack}`}
            role="progressbar"
            aria-valuenow={progressRedondeado}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Avance del envío: ${progressRedondeado}%`}
          >
            <div
              className={`h-full rounded-full transition-[width,background-color] [transition-duration:var(--motion-slow)] [transition-timing-function:var(--motion-ease-standard)] motion-reduce:transition-none ${styles.bar}`}
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Aviso de rastreo especial (incidencia) */}
      {result.flujoActual === 'ALTERNO' && result.motivoAlterno ? (
        <div className="border-t border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-warning)_7%,var(--color-card))] px-5 py-4 sm:px-6">
          <p className="flex items-start gap-2 text-sm text-[var(--color-foreground)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
            <span>
              <span className="font-semibold">Rastreo especial por una incidencia. </span>
              {result.motivoAlterno}
            </span>
          </p>
        </div>
      ) : null}

      {/* Pie con metadatos: guía consultada + última actualización */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-[var(--color-border)] px-5 py-3 sm:px-6">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <Hash className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" aria-hidden />
          <span className="text-[var(--color-muted-foreground)]">Guía</span>
          <span className="font-mono font-medium text-[var(--color-foreground)]">
            {result.numeroGuia}
          </span>
        </span>
        {fechaFormateada ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Actualizado el {fechaFormateada}
          </span>
        ) : null}
      </div>
    </section>
  );
}
