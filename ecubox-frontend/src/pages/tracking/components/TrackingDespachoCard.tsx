import type { TrackingResponse } from '@/lib/api/tracking.service';

interface TrackingDespachoCardProps {
  result: TrackingResponse;
}

export function TrackingDespachoCard({ result }: TrackingDespachoCardProps) {
  const despacho = result.despacho;
  const sacaActual = result.sacaActual;
  const agenciaDistribucionAsociada = result.operadorEntrega?.distribuidorNombre;
  const toSacaLabel = (raw?: string) => {
    if (!raw) return 'Ubicación por confirmar';
    const match = raw.match(/(\d+)$/);
    if (!match) return raw;
    const numero = Number(match[1]);
    return Number.isNaN(numero) ? raw : `Bolsa ${numero}`;
  };

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
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Peso total estimado (kg)</p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">{despacho?.pesoTotalKg ?? 0}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] p-4">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Ubicación del paquete</p>
        <p className="mt-1 text-base font-semibold text-[var(--color-foreground)]">
          {toSacaLabel(sacaActual?.numeroOrden)}
        </p>
        {sacaActual?.pesoKg != null ? (
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Peso aproximado: {sacaActual.pesoKg} kg
          </p>
        ) : null}
      </div>
    </section>
  );
}

