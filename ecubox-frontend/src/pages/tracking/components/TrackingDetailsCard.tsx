import type { TrackingResponse } from '@/lib/api/tracking.service';

interface TrackingDetailsCardProps {
  result: TrackingResponse;
}

export function TrackingDetailsCard({ result }: TrackingDetailsCardProps) {
  const dest = result.destinatario;
  const rows = [
    { label: 'Nombre', value: dest?.nombre ?? result.destinatarioNombre ?? 'No disponible' },
    { label: 'Teléfono', value: dest?.telefono ?? 'No disponible' },
    { label: 'Dirección', value: dest?.direccion ?? 'No disponible' },
    { label: 'Provincia / Cantón', value: `${dest?.provincia ?? '—'} / ${dest?.canton ?? '—'}` },
  ];

  return (
    <section className="surface-card p-5 sm:p-6 space-y-4">
      <h3 className="text-base font-semibold text-[var(--color-foreground)]">
        Destinatario
      </h3>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3.5 py-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {row.label}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">{row.value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
        Esta información corresponde a los datos disponibles de tu envío en ECUBOX.
      </p>
    </section>
  );
}

