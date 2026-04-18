import { MapPin, UserRound } from 'lucide-react';
import type { TrackingResponse } from '@/lib/api/tracking.service';

interface TrackingDetailsCardProps {
  result: TrackingResponse;
}

export function TrackingDetailsCard({ result }: TrackingDetailsCardProps) {
  const dest = result.destinatario;
  const nombre = dest?.nombre ?? result.destinatarioNombre ?? null;
  const provincia = dest?.provincia ?? null;
  const canton = dest?.canton ?? null;
  const tieneUbicacion = Boolean(provincia || canton);

  return (
    <section className="surface-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <UserRound className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          Destinatario
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        <Field
          icon={<UserRound className="h-3.5 w-3.5" />}
          label="Nombre"
          value={nombre ?? 'No disponible'}
        />
        <Field
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Provincia / Cantón"
          value={tieneUbicacion ? `${provincia ?? '—'} / ${canton ?? '—'}` : 'No disponible'}
        />
      </div>
      <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
        Por privacidad no se exponen teléfonos ni direcciones exactas en el tracking público.
      </p>
    </section>
  );
}

function Field({
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

