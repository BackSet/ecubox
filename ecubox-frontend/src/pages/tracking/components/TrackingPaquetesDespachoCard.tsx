import { useMemo } from 'react';
import { Package } from 'lucide-react';
import type { TrackingPaqueteDespacho, TrackingResponse } from '@/lib/api/tracking.service';
import { kgToLbs, lbsToKg } from '@/lib/utils/weight';

interface TrackingPaquetesDespachoCardProps {
  result: TrackingResponse;
}

interface BolsaAgrupada {
  /** Etiqueta visible (ej. "Bolsa 1") o "Sin bolsa asignada" si la saca no existe. */
  label: string;
  /** Clave de orden estable (numero de bolsa cuando se puede inferir, sino el raw). */
  sortKey: number | string;
  paquetes: TrackingPaqueteDespacho[];
  totalKg: number | null;
  totalLbs: number | null;
  /** True si en esta bolsa esta el paquete que el usuario esta viendo. */
  contieneActual: boolean;
}

const SIN_BOLSA_KEY = '__sin_bolsa__';

function formatPeso(kg: number | null, lbs: number | null): string {
  const safeKg = kg ?? (lbs != null ? lbsToKg(lbs) : null);
  const safeLbs = lbs ?? (kg != null ? kgToLbs(kg) : null);
  if (safeKg == null && safeLbs == null) return '—';
  return `${safeKg ?? 0} kg / ${safeLbs ?? 0} lbs`;
}

function inferBolsaLabel(raw?: string): { label: string; sortKey: number | string } {
  if (!raw) return { label: 'Sin bolsa asignada', sortKey: Number.POSITIVE_INFINITY };
  const match = raw.match(/(\d+)$/);
  if (!match) return { label: raw, sortKey: raw };
  const numero = Number(match[1]);
  if (Number.isNaN(numero)) return { label: raw, sortKey: raw };
  return { label: `Bolsa ${numero}`, sortKey: numero };
}

function pesoNormalizado(p: TrackingPaqueteDespacho): { kg: number | null; lbs: number | null } {
  const kg = p.pesoKg ?? (p.pesoLbs != null ? lbsToKg(p.pesoLbs) : null);
  const lbs = p.pesoLbs ?? (p.pesoKg != null ? kgToLbs(p.pesoKg) : null);
  return { kg, lbs };
}

export function TrackingPaquetesDespachoCard({ result }: TrackingPaquetesDespachoCardProps) {
  const paquetes = result.paquetesDespacho ?? [];
  const numeroGuiaActual = result.numeroGuia;

  const bolsas: BolsaAgrupada[] = useMemo(() => {
    const grupos = new Map<string, BolsaAgrupada>();
    for (const p of paquetes) {
      const rawSaca = p.sacaNumeroOrden;
      const claveGrupo = rawSaca ?? SIN_BOLSA_KEY;
      const { label, sortKey } = inferBolsaLabel(rawSaca);
      let grupo = grupos.get(claveGrupo);
      if (!grupo) {
        grupo = {
          label,
          sortKey,
          paquetes: [],
          totalKg: null,
          totalLbs: null,
          contieneActual: false,
        };
        grupos.set(claveGrupo, grupo);
      }
      grupo.paquetes.push(p);
      const { kg, lbs } = pesoNormalizado(p);
      if (kg != null) grupo.totalKg = (grupo.totalKg ?? 0) + kg;
      if (lbs != null) grupo.totalLbs = (grupo.totalLbs ?? 0) + lbs;
      if (p.numeroGuia && p.numeroGuia === numeroGuiaActual) {
        grupo.contieneActual = true;
      }
    }
    // Ordenamos por numero de bolsa ascendente; "Sin bolsa" cae al final.
    return Array.from(grupos.values()).sort((a, b) => {
      const av = typeof a.sortKey === 'number' ? a.sortKey : Number.POSITIVE_INFINITY;
      const bv = typeof b.sortKey === 'number' ? b.sortKey : Number.POSITIVE_INFINITY;
      if (av !== bv) return av - bv;
      return String(a.sortKey).localeCompare(String(b.sortKey));
    });
  }, [paquetes, numeroGuiaActual]);

  return (
    <section className="surface-card p-5 sm:p-6 space-y-4">
      <h3 className="text-base font-semibold text-[var(--color-foreground)]">
        Otros envíos del mismo lote
      </h3>
      {bolsas.length === 0 ? (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
          No hay paquetes asociados para mostrar.
        </p>
      ) : (
        <ul className="space-y-3">
          {bolsas.map((bolsa) => (
            <li
              key={`${bolsa.label}-${String(bolsa.sortKey)}`}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    {bolsa.label}
                  </span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    · {bolsa.paquetes.length}{' '}
                    {bolsa.paquetes.length === 1 ? 'paquete' : 'paquetes'}
                  </span>
                </div>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  Peso total: {formatPeso(bolsa.totalKg, bolsa.totalLbs)}
                </span>
              </div>

              <ul className="divide-y divide-[var(--color-border)]">
                {bolsa.paquetes.map((p, idx) => {
                  const esActual = !!p.numeroGuia && p.numeroGuia === numeroGuiaActual;
                  const { kg, lbs } = pesoNormalizado(p);
                  return (
                    <li
                      key={`${p.id ?? idx}-${p.numeroGuia ?? idx}`}
                      aria-current={esActual ? 'true' : undefined}
                      className={`flex items-center justify-between gap-3 py-2 px-2 rounded-md ${
                        esActual
                          ? 'bg-[var(--color-primary)]/10 border-l-2 border-[var(--color-primary)] -mx-2 pl-3'
                          : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`text-sm break-all ${
                            esActual
                              ? 'font-semibold text-[var(--color-primary)]'
                              : 'text-[var(--color-foreground)]'
                          }`}
                        >
                          {p.numeroGuia ?? '—'}
                        </p>
                        {esActual ? (
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--color-primary)]">
                            Tu paquete
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs text-[var(--color-muted-foreground)] tabular-nums">
                        {formatPeso(kg, lbs)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
