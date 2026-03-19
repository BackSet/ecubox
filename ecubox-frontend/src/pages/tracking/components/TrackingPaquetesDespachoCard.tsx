import type { TrackingResponse } from '@/lib/api/tracking.service';

interface TrackingPaquetesDespachoCardProps {
  result: TrackingResponse;
}

export function TrackingPaquetesDespachoCard({ result }: TrackingPaquetesDespachoCardProps) {
  const paquetes = result.paquetesDespacho ?? [];
  const toSacaLabel = (raw?: string) => {
    if (!raw) return 'Sin saca';
    const match = raw.match(/(\d+)$/);
    if (!match) return raw;
    const numero = Number(match[1]);
    return Number.isNaN(numero) ? raw : `Saca ${numero}`;
  };

  return (
    <section className="surface-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
        Otros paquetes del mismo despacho
      </h3>
      {paquetes.length === 0 ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">No hay paquetes asociados para mostrar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="compact-table min-w-[560px]">
            <thead>
              <tr>
                <th>Número de guía</th>
                <th>Estado actual</th>
                <th>Ubicación</th>
                <th>Peso kg</th>
              </tr>
            </thead>
            <tbody>
              {paquetes.map((p, idx) => (
                <tr key={`${p.id ?? idx}-${p.numeroGuia ?? idx}`}>
                  <td className="font-medium">{p.numeroGuia ?? '—'}</td>
                  <td>{p.estadoRastreoNombre ?? '—'}</td>
                  <td>{toSacaLabel(p.sacaNumeroOrden)}</td>
                  <td>{p.pesoKg ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

