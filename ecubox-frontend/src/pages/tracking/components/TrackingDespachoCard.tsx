import type { ReactNode } from 'react';
import { Boxes, Hash, Layers3, PackageCheck, Scale, ShieldCheck, Truck } from 'lucide-react';
import type { TrackingResponse } from '@/lib/api/tracking.service';
import { kgToLbs, lbsToKg } from '@/lib/utils/weight';

interface TrackingDespachoCardProps {
  result: TrackingResponse;
}

export function TrackingDespachoCard({ result }: TrackingDespachoCardProps) {
  const despacho = result.despacho;
  const totalKg =
    despacho?.pesoTotalKg ??
    (despacho?.pesoTotalLbs != null ? lbsToKg(despacho.pesoTotalLbs) : null);
  const totalLbs =
    despacho?.pesoTotalLbs ??
    (despacho?.pesoTotalKg != null ? kgToLbs(despacho.pesoTotalKg) : null);
  const agenciaDistribucion = result.operadorEntrega?.courierEntregaNombre;

  const pesoTotal =
    totalKg != null || totalLbs != null
      ? `${totalKg ?? 0} kg · ${totalLbs ?? 0} lbs`
      : 'No disponible';

  return (
    <section className="surface-card space-y-5 p-5 sm:p-6">
      <h3 className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-foreground)]">
        <PackageCheck className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        Resumen del envío
      </h3>

      {/* Identificadores del despacho: qué guía, quién distribuye y el precinto */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          icon={<Hash className="h-3.5 w-3.5" />}
          label="Guía de envío"
          value={despacho?.numeroGuia ?? 'No disponible'}
          mono
        />
        <Field
          icon={<Truck className="h-3.5 w-3.5" />}
          label="Agencia de distribución"
          value={agenciaDistribucion ?? 'No disponible'}
        />
        <Field
          className="sm:col-span-2"
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label="Código de seguridad del envío"
          value={despacho?.codigoPrecinto ?? 'No disponible'}
          mono
        />
      </div>

      {/* Totales del lote: una sola lectura del peso total (no se repite abajo) */}
      <div className="grid grid-cols-3 gap-3">
        <Metric
          icon={<Boxes className="h-4 w-4" />}
          label="Bolsas"
          value={String(despacho?.totalSacas ?? 0)}
        />
        <Metric
          icon={<Layers3 className="h-4 w-4" />}
          label="Envíos en el lote"
          value={String(despacho?.totalPaquetes ?? 0)}
        />
        <Metric
          icon={<Scale className="h-4 w-4" />}
          label="Peso total"
          value={pesoTotal}
        />
      </div>
    </section>
  );
}

function Field({
  icon,
  label,
  value,
  mono,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3.5 py-3 ${className ?? ''}`}
    >
      <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold text-[var(--color-foreground)] break-words ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-3 text-center sm:text-left">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-bold leading-tight text-[var(--color-foreground)] tabular-nums">
        {value}
      </p>
    </div>
  );
}
