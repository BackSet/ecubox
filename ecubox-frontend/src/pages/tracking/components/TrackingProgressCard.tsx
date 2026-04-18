import { Activity, AlertTriangle, CalendarClock, CheckCircle2, Clock, Hourglass } from 'lucide-react';
import type { TrackingResponse } from '@/lib/api/tracking.service';

interface TrackingProgressCardProps {
  result: TrackingResponse;
  totalPasosBase: number;
  pasoBaseActual: number;
}

function clampPercentage(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function TrackingProgressCard({
  result,
  totalPasosBase,
  pasoBaseActual,
}: TrackingProgressCardProps) {
  const pasosCompletados = pasoBaseActual > 0 ? pasoBaseActual : 0;
  const progress = totalPasosBase > 0
    ? clampPercentage((pasosCompletados / totalPasosBase) * 100)
    : 0;
  const progressRedondeado = Math.round(progress);

  const showDias =
    !result.cuentaRegresivaFinalizada &&
    result.diasMaxRetiro != null &&
    (result.diasTranscurridos != null || result.diasRestantes != null);
  const diasAtrasoRetiro =
    result.diasMaxRetiro != null && result.diasTranscurridos != null
      ? Math.max(0, result.diasTranscurridos - result.diasMaxRetiro)
      : 0;
  const periodoVencido = Boolean(result.paqueteVencido) || diasAtrasoRetiro > 0;
  const periodoCumplido = !periodoVencido && result.diasRestantes === 0;
  const periodoEnRango = !periodoVencido && (result.diasRestantes ?? 0) > 0;

  const completo = totalPasosBase > 0 && pasosCompletados >= totalPasosBase;

  return (
    <section className="surface-card space-y-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-foreground)]">
            <Activity className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            Avance y tiempos
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Este avance es una referencia según las etapas de tu envío.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            completo
              ? 'bg-[color-mix(in_oklab,var(--color-success)_18%,transparent)] text-[color-mix(in_oklab,var(--color-success)_80%,var(--color-foreground))]'
              : 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
          }`}
        >
          {completo ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Hourglass className="h-3.5 w-3.5" />}
          {progressRedondeado}%
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium text-[var(--color-foreground)]">
            Paso{' '}
            <span className="text-[var(--color-primary)]">{pasosCompletados}</span>{' '}
            de {totalPasosBase || 0}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Solo etapas principales
          </p>
        </div>

        {totalPasosBase > 0 ? (
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${totalPasosBase}, minmax(0, 1fr))` }}
            aria-label={`Progreso ${progressRedondeado} por ciento`}
          >
            {Array.from({ length: totalPasosBase }).map((_, i) => {
              const done = i < pasosCompletados;
              const current = i === pasosCompletados - 1 && !completo;
              return (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    done
                      ? current
                        ? 'bg-[var(--color-primary)] shadow-[0_0_0_2px_var(--color-primary)]/15'
                        : 'bg-[var(--color-primary)]'
                      : 'bg-[var(--color-muted)]'
                  }`}
                />
              );
            })}
          </div>
        ) : (
          <div className="h-2 rounded-full bg-[var(--color-muted)]" />
        )}
      </div>

      {result.cuentaRegresivaFinalizada ? (
        <div className="ui-alert ui-alert-success flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="font-medium">
            Cuenta regresiva finalizada para este envío.
          </span>
        </div>
      ) : showDias ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatTile
            label="Días transcurridos"
            value={result.diasTranscurridos ?? 0}
            icon={<Clock className="h-4 w-4" />}
            tone="neutral"
          />
          <StatTile
            label="Días restantes para retiro"
            value={result.diasRestantes ?? 0}
            icon={<CalendarClock className="h-4 w-4" />}
            tone={periodoVencido ? 'danger' : periodoCumplido ? 'warning' : 'success'}
          />
          {periodoVencido ? (
            <p className="flex items-start gap-2 rounded-lg border border-[var(--color-destructive)]/35 bg-[var(--color-destructive)]/10 px-4 py-3 text-sm font-medium text-[var(--color-destructive)] sm:col-span-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>El plazo para retirar tu envío venció hace {diasAtrasoRetiro} día(s).</span>
            </p>
          ) : null}
          {periodoEnRango ? (
            <p className="flex items-start gap-2 rounded-lg border border-[var(--color-info)]/35 bg-[var(--color-info)]/10 px-4 py-3 text-sm font-medium text-[var(--color-foreground)] sm:col-span-2">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-info)]" />
              <span>Puedes retirar tu envío en los próximos {result.diasRestantes ?? 0} día(s).</span>
            </p>
          ) : null}
          {periodoCumplido ? (
            <p className="ui-alert ui-alert-warning flex items-start gap-2 sm:col-span-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Hoy es el último día para retirar tu envío.</span>
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
          No contamos con un plazo de retiro para este envío por el momento.
        </p>
      )}
    </section>
  );
}

interface StatTileProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
}

function StatTile({ label, value, icon, tone }: StatTileProps) {
  const toneClasses: Record<StatTileProps['tone'], string> = {
    neutral:
      'border-[var(--color-border)] bg-[var(--color-muted)]/30 text-[var(--color-foreground)]',
    success:
      'border-[color-mix(in_oklab,var(--color-success)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-success)_12%,transparent)] text-[color-mix(in_oklab,var(--color-success)_80%,var(--color-foreground))]',
    warning:
      'border-[color-mix(in_oklab,var(--color-warning)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-warning)_12%,transparent)] text-[color-mix(in_oklab,var(--color-warning)_80%,var(--color-foreground))]',
    danger:
      'border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]',
  };

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClasses[tone]}`}>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold leading-tight">{value}</p>
    </div>
  );
}
