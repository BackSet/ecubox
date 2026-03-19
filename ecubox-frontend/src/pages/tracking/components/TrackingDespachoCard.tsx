import type { TrackingResponse } from '@/lib/api/tracking.service';

interface TrackingDespachoCardProps {
  result: TrackingResponse;
}

export function TrackingDespachoCard({ result }: TrackingDespachoCardProps) {
  const despacho = result.despacho;
  const sacaActual = result.sacaActual;
  const toSacaLabel = (raw?: string) => {
    if (!raw) return 'Sin saca asignada';
    const match = raw.match(/(\d+)$/);
    if (!match) return raw;
    const numero = Number(match[1]);
    return Number.isNaN(numero) ? raw : `Saca ${numero}`;
  };

  return (
    <section className="surface-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
        Resumen del envío
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Guía del despacho</p>
          <p className="text-[var(--color-foreground)] font-medium">{despacho?.numeroGuia ?? 'No disponible'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Precinto de seguridad</p>
          <p className="text-[var(--color-foreground)]">{despacho?.codigoPrecinto ?? 'No disponible'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Número de sacas</p>
          <p className="text-[var(--color-foreground)]">{despacho?.totalSacas ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Paquetes en este despacho</p>
          <p className="text-[var(--color-foreground)]">{despacho?.totalPaquetes ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Peso total estimado (kg)</p>
          <p className="text-[var(--color-foreground)]">{despacho?.pesoTotalKg ?? 0}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] p-3">
        <p className="text-xs text-[var(--color-muted-foreground)]">Ubicación del paquete dentro del despacho</p>
        <p className="text-sm font-medium text-[var(--color-foreground)] mt-1">
          {toSacaLabel(sacaActual?.numeroOrden)}
        </p>
        {sacaActual?.numeroOrden ? (
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            Código interno: {sacaActual.numeroOrden}
          </p>
        ) : null}
        <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
          Tamaño de saca: {sacaActual?.tamanio ?? 'No disponible'} | Peso aprox.: {sacaActual?.pesoKg ?? 0} kg
        </p>
      </div>
    </section>
  );
}

