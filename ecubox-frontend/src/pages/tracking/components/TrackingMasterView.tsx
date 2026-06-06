import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Boxes,
  CalendarClock,
  Hash,
  MapPin,
  PackageCheck,
  Truck,
  UserRound,
} from 'lucide-react';
import type {
  EstadoGuiaMaster,
  TrackingMasterEventoItem,
  TrackingMasterResponse,
  TrackingPiezaItem,
} from '@/lib/api/tracking.service';
import { getDomainStatusTone } from '@/components/ui/StatusBadge';
import { PiezasProgress } from '@/components/PiezasProgress';
import { TrackingPiezasList } from '@/pages/tracking/components/TrackingPiezasList';

interface TrackingMasterViewProps {
  master: TrackingMasterResponse;
  onSelectPieza: (numeroGuia: string) => void;
}

const ESTADO_LABELS: Record<EstadoGuiaMaster, string> = {
  SIN_PIEZAS_REGISTRADAS: 'Sin piezas registradas',
  EN_ESPERA_RECEPCION: 'En espera de recepción',
  RECEPCION_PARCIAL: 'Recepción parcial',
  RECEPCION_COMPLETA: 'Recepción completa',
  DESPACHO_PARCIAL: 'En despacho parcial',
  DESPACHO_COMPLETADO: 'Despacho completado',
  DESPACHO_INCOMPLETO: 'Despacho incompleto',
  CANCELADA: 'Cancelada',
  EN_REVISION: 'En revisión',
};

type HeroTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

/** Colapsa el StatusTone (6 valores) al tono visual del héroe (5 valores). */
function resolveMasterTone(estado?: EstadoGuiaMaster | null): HeroTone {
  const tone = getDomainStatusTone(estado);
  if (tone === 'primary') return 'info';
  if (tone === 'error') return 'danger';
  return tone as HeroTone;
}

const TONE_STYLES: Record<HeroTone, { band: string; icon: string; percent: string }> = {
  neutral: {
    band: 'bg-[var(--color-muted)]/40',
    icon: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
    percent: 'text-[var(--color-muted-foreground)]',
  },
  info: {
    band: 'bg-[color-mix(in_oklab,var(--color-info)_9%,var(--color-card))]',
    icon: 'bg-[color-mix(in_oklab,var(--color-info)_16%,transparent)] text-[var(--color-info)]',
    percent: 'text-[var(--color-info)]',
  },
  success: {
    band: 'bg-[color-mix(in_oklab,var(--color-success)_10%,var(--color-card))]',
    icon: 'bg-[color-mix(in_oklab,var(--color-success)_16%,transparent)] text-[var(--color-success)]',
    percent: 'text-[var(--color-success)]',
  },
  warning: {
    band: 'bg-[color-mix(in_oklab,var(--color-warning)_11%,var(--color-card))]',
    icon: 'bg-[color-mix(in_oklab,var(--color-warning)_18%,transparent)] text-[var(--color-warning)]',
    percent: 'text-[var(--color-warning)]',
  },
  danger: {
    band: 'bg-[color-mix(in_oklab,var(--color-destructive)_10%,var(--color-card))]',
    icon: 'bg-[color-mix(in_oklab,var(--color-destructive)_16%,transparent)] text-[var(--color-destructive)]',
    percent: 'text-[var(--color-destructive)]',
  },
};

function resolveHeroIcon(tone: HeroTone): ReactNode {
  if (tone === 'danger' || tone === 'warning') return <AlertTriangle className="h-7 w-7" />;
  if (tone === 'success') return <PackageCheck className="h-7 w-7" />;
  return <Boxes className="h-7 w-7" />;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TrackingMasterView({ master, onSelectPieza }: TrackingMasterViewProps) {
  const total = master.totalPiezasEsperadas ?? master.piezasRegistradas ?? 0;
  const recibidas = master.piezasRecibidas ?? 0;
  const despachadas = master.piezasDespachadas ?? 0;
  const registradas = master.piezasRegistradas ?? 0;
  const piezas: TrackingPiezaItem[] = master.piezas ?? [];

  const safeTotal = Math.max(total, 1);
  const pctDespachadas = total > 0 ? Math.min(100, (despachadas / safeTotal) * 100) : 0;
  const pctDespachadasRedondeado = Math.round(pctDespachadas);

  const estadoLabel = master.estadoGlobal ? ESTADO_LABELS[master.estadoGlobal] : 'Sin estado';
  const tone = resolveMasterTone(master.estadoGlobal);
  const styles = TONE_STYLES[tone];

  const dest = master.consignatario;
  const consignatarioNombre = dest?.nombre ?? master.consignatarioNombre ?? null;
  const consignatarioProvincia = dest?.provincia ?? null;
  const consignatarioCanton = dest?.canton ?? null;
  const tieneUbicacion = Boolean(consignatarioProvincia || consignatarioCanton);

  const fechaPrimeraRecepcion = formatDate(master.fechaPrimeraRecepcion);
  const fechaPrimerDespacho = formatDate(master.fechaPrimeraPiezaDespachada);

  const timeline: TrackingMasterEventoItem[] = useMemo(() => {
    const base = master.timeline ?? [];
    return [...base]
      .sort((a, b) => {
        const at = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
        const bt = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
        return bt - at;
      })
      .slice(0, 30);
  }, [master.timeline]);

  return (
    <section className="space-y-5">
      {/* Héroe de estado de la guía consolidada */}
      <div className="surface-card overflow-hidden">
        <div className={`${styles.band} p-5 sm:p-6`}>
          <div className="flex items-start gap-4">
            <span
              className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}
              aria-hidden
            >
              {resolveHeroIcon(tone)}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Guía consolidada
              </p>
              <h2 className="text-2xl font-bold leading-tight tracking-tight text-[var(--color-foreground)] sm:text-[1.75rem]">
                {estadoLabel}
              </h2>
              {consignatarioNombre ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Consignatario:{' '}
                  <span className="font-medium text-[var(--color-foreground)]">
                    {consignatarioNombre}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          {total > 0 ? (
            <div className="mt-5 space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  {despachadas} de {total} piezas despachadas
                </p>
                <p className={`text-sm font-bold tabular-nums ${styles.percent}`}>
                  {pctDespachadasRedondeado}%
                </p>
              </div>
              {/* Barra + leyenda compartidas (el encabezado/porcentaje ya se muestra arriba). */}
              <PiezasProgress
                total={total}
                registradas={registradas}
                recibidas={recibidas}
                despachadas={despachadas}
                size="md"
                headingMode="none"
              />
            </div>
          ) : (
            <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-dashed border-[var(--color-border)] p-3 text-xs text-[var(--color-muted-foreground)]">
              <AlertCircle className="h-4 w-4" />
              Aún no se ha definido el total de piezas esperadas para esta guía.
            </div>
          )}
        </div>

        {/* Pie de metadatos: guía + fechas clave */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-[var(--color-border)] px-5 py-3 sm:px-6">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Hash className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" aria-hidden />
            <span className="text-[var(--color-muted-foreground)]">Guía</span>
            <span className="font-mono font-medium text-[var(--color-foreground)] break-all">
              {master.trackingBase}
            </span>
          </span>
          {fechaPrimeraRecepcion ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Primera recepción: {fechaPrimeraRecepcion}
            </span>
          ) : null}
          {fechaPrimerDespacho ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
              <Truck className="h-3.5 w-3.5" aria-hidden />
              Primer despacho: {fechaPrimerDespacho}
            </span>
          ) : null}
        </div>
      </div>

      {consignatarioNombre || tieneUbicacion ? (
        <div className="surface-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <h3 className="text-base font-semibold text-[var(--color-foreground)]">
              Consignatario
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <ConsignatarioField
              icon={<UserRound className="h-3.5 w-3.5" />}
              label="Nombre"
              value={consignatarioNombre ?? 'No disponible'}
            />
            <ConsignatarioField
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Provincia / Cantón"
              value={
                tieneUbicacion
                  ? `${consignatarioProvincia ?? '—'} / ${consignatarioCanton ?? '—'}`
                  : 'No disponible'
              }
            />
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Esta información corresponde a los datos disponibles del consolidado en ECUBOX.
            Por privacidad no se exponen teléfonos ni direcciones exactas.
          </p>
        </div>
      ) : null}

      <TrackingPiezasList
        piezas={piezas}
        totalEsperadas={total}
        onSelectPieza={onSelectPieza}
        titulo="Piezas de esta guía"
      />

      {timeline.length > 0 ? (
        <div className="surface-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <h3 className="text-base font-semibold text-[var(--color-foreground)]">
              Actividad reciente
            </h3>
          </div>
          <ol className="space-y-3">
            {timeline.map((ev, idx) => {
              const piezaLabel =
                ev.piezaNumero != null
                  ? `Pieza ${ev.piezaNumero}${ev.piezaTotal ? `/${ev.piezaTotal}` : ''}`
                  : 'Pieza';
              return (
                <li
                  key={`${ev.numeroGuia}-${ev.occurredAt ?? idx}`}
                  className="flex items-start gap-3"
                >
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-foreground)]">
                      <span className="font-medium">{piezaLabel}</span>
                      {ev.estadoNombre ? ` · ${ev.estadoNombre}` : ''}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {ev.numeroGuia ? (
                        <a
                          href={`/tracking?codigo=${encodeURIComponent(ev.numeroGuia)}`}
                          onClick={(e) => {
                            if (
                              e.button !== 0 ||
                              e.metaKey ||
                              e.ctrlKey ||
                              e.shiftKey ||
                              e.altKey
                            )
                              return;
                            e.preventDefault();
                            if (ev.numeroGuia) onSelectPieza(ev.numeroGuia);
                          }}
                          className="underline-offset-2 hover:underline break-all text-[var(--color-primary)]"
                        >
                          {ev.numeroGuia}
                        </a>
                      ) : null}
                      {ev.occurredAt ? ` · ${formatDateTime(ev.occurredAt)}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

function ConsignatarioField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3.5 py-3">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--color-foreground)] break-words">
        {value}
      </p>
    </div>
  );
}
