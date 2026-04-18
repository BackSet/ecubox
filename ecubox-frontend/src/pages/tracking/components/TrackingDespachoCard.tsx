import type { TrackingResponse } from '@/lib/api/tracking.service';
import { kgToLbs, lbsToKg } from '@/lib/utils/weight';

interface TrackingDespachoCardProps {
  result: TrackingResponse;
}

export function TrackingDespachoCard({ result }: TrackingDespachoCardProps) {
  const despacho = result.despacho;
  const totalKg = despacho?.pesoTotalKg ?? (despacho?.pesoTotalLbs != null ? lbsToKg(despacho.pesoTotalLbs) : null);
  const totalLbs = despacho?.pesoTotalLbs ?? (despacho?.pesoTotalKg != null ? kgToLbs(despacho.pesoTotalKg) : null);
  const agenciaDistribucionAsociada = result.operadorEntrega?.distribuidorNombre;

  return (
    <section className="surface-card p-5 sm:p-6 space-y-4">
      <h3 className="text-base font-semibold text-[var(--color-foreground)]">
        Resumen del envío
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3.5 py-3 lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Guía de envío</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">{despacho?.numeroGuia ?? 'No disponible'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Agencia de distribución asociada
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                {agenciaDistribucionAsociada ?? 'No disponible'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3.5 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Código de seguridad del envío</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">{despacho?.codigoPrecinto ?? 'No disponible'}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3.5 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Bolsas de transporte</p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">{despacho?.totalSacas ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3.5 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Envíos en el mismo lote</p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">{despacho?.totalPaquetes ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3.5 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Peso total estimado</p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
            {totalKg != null || totalLbs != null ? `${totalKg ?? 0} kg / ${totalLbs ?? 0} lbs` : '0 kg / 0 lbs'}
          </p>
        </div>
      </div>
    </section>
  );
}

