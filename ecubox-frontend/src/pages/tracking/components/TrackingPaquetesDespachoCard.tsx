import type { TrackingResponse } from '@/lib/api/tracking.service';
import { kgToLbs, lbsToKg } from '@/lib/utils/weight';

interface TrackingPaquetesDespachoCardProps {
  result: TrackingResponse;
}

export function TrackingPaquetesDespachoCard({ result }: TrackingPaquetesDespachoCardProps) {
  const paquetes = result.paquetesDespacho ?? [];
  const formatPeso = (kg?: number, lbs?: number) => {
    const safeKg = kg ?? (lbs != null ? lbsToKg(lbs) : null);
    const safeLbs = lbs ?? (kg != null ? kgToLbs(kg) : null);
    if (safeKg == null && safeLbs == null) return '0 kg / 0 lbs';
    return `${safeKg ?? 0} kg / ${safeLbs ?? 0} lbs`;
  };
  const toSacaLabel = (raw?: string) => {
    if (!raw) return 'Ubicación pendiente';
    const match = raw.match(/(\d+)$/);
    if (!match) return raw;
    const numero = Number(match[1]);
    return Number.isNaN(numero) ? raw : `Bolsa ${numero}`;
  };

  return (
    <section className="surface-card p-5 sm:p-6 space-y-4">
      <h3 className="text-base font-semibold text-[var(--color-foreground)]">
        Otros envíos del mismo lote
      </h3>
      {paquetes.length === 0 ? (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
          No hay paquetes asociados para mostrar.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="compact-table min-w-[560px]">
            <thead>
              <tr>
                <th>Número de guía</th>
                <th>Estado actual</th>
                <th>Ubicación</th>
                <th>Peso (kg / lbs)</th>
              </tr>
            </thead>
            <tbody>
              {paquetes.map((p, idx) => (
                <tr key={`${p.id ?? idx}-${p.numeroGuia ?? idx}`}>
                  <td className="font-medium">{p.numeroGuia ?? '—'}</td>
                  <td>{p.estadoRastreoNombre ?? '—'}</td>
                  <td>{toSacaLabel(p.sacaNumeroOrden)}</td>
                  <td>{formatPeso(p.pesoKg, p.pesoLbs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

