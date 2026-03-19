import type { TrackingResponse } from '@/lib/api/tracking.service';

interface TrackingDetailsCardProps {
  result: TrackingResponse;
}

export function TrackingDetailsCard({ result }: TrackingDetailsCardProps) {
  const dest = result.destinatario;
  return (
    <section className="surface-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
        Destinatario
      </h3>
      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Nombre</p>
          <p className="text-[var(--color-foreground)] font-medium">
            {dest?.nombre ?? result.destinatarioNombre ?? 'No disponible'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Teléfono</p>
          <p className="text-[var(--color-foreground)]">{dest?.telefono ?? 'No disponible'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Dirección</p>
          <p className="text-[var(--color-foreground)]">{dest?.direccion ?? 'No disponible'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Provincia / Cantón</p>
          <p className="text-[var(--color-foreground)]">
            {dest?.provincia ?? '—'} / {dest?.canton ?? '—'}
          </p>
        </div>
      </div>
      <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
        La información mostrada depende de los eventos registrados por ECUBOX para esta guía.
      </p>
    </section>
  );
}

