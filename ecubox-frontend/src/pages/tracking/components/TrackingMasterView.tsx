import { useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  MapPin,
  Package,
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
import { TrackingPiezasList } from '@/pages/tracking/components/TrackingPiezasList';

interface TrackingMasterViewProps {
  master: TrackingMasterResponse;
  onSelectPieza: (numeroGuia: string) => void;
}

const ESTADO_LABELS: Record<EstadoGuiaMaster, string> = {
  EN_ESPERA_RECEPCION: 'En espera de recepción',
  RECEPCION_PARCIAL: 'Recepción parcial',
  RECEPCION_COMPLETA: 'Recepción completa',
  DESPACHO_PARCIAL: 'En despacho parcial',
  DESPACHO_COMPLETADO: 'Despacho completado',
  DESPACHO_INCOMPLETO: 'Despacho incompleto',
  CANCELADA: 'Cancelada',
  EN_REVISION: 'En revisión',
};

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

  const progresoRecibidas = total > 0 ? Math.min(100, (recibidas / total) * 100) : 0;
  const progresoDespachadas = total > 0 ? Math.min(100, (despachadas / total) * 100) : 0;

  const estadoLabel = master.estadoGlobal ? ESTADO_LABELS[master.estadoGlobal] : 'Sin estado';

  const dest = master.consignatario;
  const consignatarioNombre = dest?.nombre ?? master.consignatarioNombre ?? null;
  const consignatarioProvincia = dest?.provincia ?? null;
  const consignatarioCanton = dest?.canton ?? null;
  const tieneUbicacion = Boolean(consignatarioProvincia || consignatarioCanton);

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
      <div className="surface-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Guía del consolidador
            </p>
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)] break-all">
              {master.trackingBase}
            </h2>
            {consignatarioNombre ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Consignatario: <span className="font-medium">{consignatarioNombre}</span>
              </p>
            ) : null}
          </div>
          <span className="self-start inline-flex items-center gap-1.5 rounded-full bg-[var(--color-muted)] px-3 py-1 text-xs font-medium text-[var(--color-foreground)]">
            <PackageCheck className="h-3.5 w-3.5" />
            {estadoLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric icon={<Package className="h-4 w-4" />} label="Esperadas" value={total} />
          <Metric icon={<Package className="h-4 w-4" />} label="Registradas" value={registradas} />
          <Metric icon={<PackageCheck className="h-4 w-4" />} label="Recibidas" value={recibidas} />
          <Metric icon={<Truck className="h-4 w-4" />} label="Despachadas" value={despachadas} />
        </div>

        {total > 0 ? (
          <div className="space-y-3 pt-1">
            <ProgressBar
              label={`Recibidas ${recibidas}/${total}`}
              percent={progresoRecibidas}
              tone="primary"
            />
            <ProgressBar
              label={`Despachadas ${despachadas}/${total}`}
              percent={progresoDespachadas}
              tone="success"
            />
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--color-border)] p-3 text-xs text-[var(--color-muted-foreground)] inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Aún no se ha definido el total de piezas esperadas para esta guía.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-[var(--color-muted-foreground)]">
          <DateChip label="Primera recepción" value={formatDate(master.fechaPrimeraRecepcion)} />
          <DateChip
            label="Primer despacho"
            value={formatDate(master.fechaPrimeraPiezaDespachada)}
          />
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

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
      <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">{value}</p>
    </div>
  );
}

function ProgressBar({
  label,
  percent,
  tone,
}: {
  label: string;
  percent: number;
  tone: 'primary' | 'success';
}) {
  const barColor =
    tone === 'success' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-primary)]';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
        <span>{label}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--color-muted)] overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function DateChip({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[var(--color-foreground)]">{value ?? '—'}</p>
    </div>
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
