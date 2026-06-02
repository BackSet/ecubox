import { AlertTriangle, CalendarClock, CheckCircle2, Clock } from 'lucide-react';
import type { TrackingResponse } from '@/lib/api/tracking.service';

interface TrackingProgressCardProps {
  result: TrackingResponse;
  totalPasosBase: number;
  pasoBaseActual: number;
}

/**
 * Tarjeta centrada en el PLAZO DE RETIRO del envío. El avance porcentual y los
 * pasos viven ahora en el héroe de estado (TrackingSummaryCard); aquí el cliente
 * solo ve "cuánto tiempo tengo para retirar" y los avisos asociados.
 *
 * Si no hay información de plazo, la tarjeta no se renderiza para no mostrar
 * una sección vacía o irrelevante.
 */
export function TrackingProgressCard({ result }: TrackingProgressCardProps) {
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

  // Sin cuenta regresiva finalizada y sin días → no hay nada útil que mostrar.
  if (!result.cuentaRegresivaFinalizada && !showDias) {
    return null;
  }

  return (
    <section className="surface-card space-y-5 p-5 sm:p-6">
      <div className="space-y-1">
        <h3 className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-foreground)]">
          <CalendarClock className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          Plazo para retirar
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Tiempo disponible para retirar tu envío una vez llega a destino.
        </p>
      </div>

      {result.cuentaRegresivaFinalizada ? (
        <div className="ui-alert ui-alert-success flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="font-medium">
            El plazo de retiro de este envío ya finalizó.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatTile
            label="Días transcurridos"
            value={result.diasTranscurridos ?? 0}
            icon={<Clock className="h-4 w-4" />}
            tone="neutral"
          />
          <StatTile
            label="Días restantes"
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
