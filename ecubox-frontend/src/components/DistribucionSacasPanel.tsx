import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, Layers, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { QuickPresetChips } from '@/components/QuickPresetChips';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';
import {
  buildManualPresets,
  buildNumSacasQuickPresets,
  computeDistributionPreview,
  MAX_POR_SACA_QUICK_PRESETS,
  type DistribucionSacasState,
} from '@/lib/utils/saca-distribution';
import { formatWeightFromValues } from '@/lib/utils/weight';

export interface PaquetePesoDetalle {
  kg: number;
  lbs: number;
}

export interface DistribucionSacasPanelProps {
  totalPaquetes: number;
  paquetesDetalle?: PaquetePesoDetalle[];
  value: DistribucionSacasState;
  onChange: (state: DistribucionSacasState) => void;
  error?: string | null;
  className?: string;
}

export function DistribucionSacasPanel({
  totalPaquetes,
  paquetesDetalle = [],
  value,
  onChange,
  error,
  className,
}: DistribucionSacasPanelProps) {
  const distribucionPreview = useMemo(
    () => computeDistributionPreview(totalPaquetes, value),
    [totalPaquetes, value],
  );

  const distribucionPreviewDetalle = useMemo(() => {
    if (!distribucionPreview) return null;
    let cursor = 0;
    return distribucionPreview.map((count) => {
      const slice = paquetesDetalle.slice(cursor, cursor + count);
      cursor += count;
      let kg = 0;
      let lbs = 0;
      for (const p of slice) {
        kg += p.kg;
        lbs += p.lbs;
      }
      return { count, kg, lbs };
    });
  }, [distribucionPreview, paquetesDetalle]);

  const manualPresets = useMemo(
    () => buildManualPresets(totalPaquetes),
    [totalPaquetes],
  );

  const numSacasPresets = useMemo(
    () => buildNumSacasQuickPresets(totalPaquetes),
    [totalPaquetes],
  );

  const maxPorSacaPresets = MAX_POR_SACA_QUICK_PRESETS;
  const advancedActive =
    value.tipo === 'manual' || value.automaticaTipo === 'maxPorSaca';
  const [advancedOpen, setAdvancedOpen] = useState(advancedActive);

  useEffect(() => {
    if (advancedActive) setAdvancedOpen(true);
  }, [advancedActive]);

  const update = (partial: Partial<DistribucionSacasState>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Layers className="h-3.5 w-3.5 text-[var(--color-primary)]" />
          Distribución automática
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label htmlFor="numero-sacas-auto" className="text-muted-foreground">
          Número de sacas:
        </label>
        <Input
          id="numero-sacas-auto"
          type="number"
          min={1}
          max={Math.max(totalPaquetes, 1)}
          value={value.automaticaNumSacas}
          onFocus={() => {
            if (value.tipo !== 'automatica' || value.automaticaTipo !== 'numSacas') {
              update({ tipo: 'automatica', automaticaTipo: 'numSacas' });
            }
          }}
          onChange={(e) =>
            update({
              tipo: 'automatica',
              automaticaTipo: 'numSacas',
              automaticaNumSacas: Math.max(
                1,
                parseInt(e.target.value, 10) || 1,
              ),
            })
          }
          className="h-8 w-20 font-mono text-sm"
          aria-describedby="numero-sacas-auto-help"
        />
        <span id="numero-sacas-auto-help" className="text-muted-foreground">
          reparte los paquetes en partes similares
        </span>
      </div>

      <div className="rounded-md border border-border bg-[var(--color-muted)]/10">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium text-foreground ui-transition hover:bg-[var(--color-muted)]/30"
          aria-expanded={advancedOpen}
        >
          <span className="inline-flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            Opciones avanzadas
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground ui-transition',
              advancedOpen && 'rotate-180',
            )}
          />
        </button>

        <div className={cn('space-y-3 px-3 pb-3', !advancedOpen && 'hidden')}>
          <SegmentedControl
            value={value.tipo}
            onValueChange={(tipo) => update({ tipo })}
            options={[
              { value: 'automatica', label: 'Automática' },
              { value: 'manual', label: 'Manual' },
            ]}
          />

          {value.tipo === 'manual' && (
            <div className="space-y-2">
              {manualPresets.length > 0 && (
                <QuickPresetChips
                  options={manualPresets.map((preset) => ({
                    label: preset.label,
                    value: preset.value,
                  }))}
                  value={value.manual}
                  onSelect={(manual) => update({ manual })}
                />
              )}
              <Input
                type="text"
                value={value.manual}
                onChange={(e) =>
                  update({ manual: e.target.value.replace(/[^0-9,]/g, '') })
                }
                placeholder="Ej. 1,2,4"
                className="w-full max-w-xs font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Números separados por comas. La suma debe ser{' '}
                <span className="font-semibold text-foreground">{totalPaquetes}</span>.
              </p>
            </div>
          )}

          {value.tipo === 'automatica' && (
            <div className="space-y-3">
              <SegmentedControl
                value={value.automaticaTipo}
                onValueChange={(automaticaTipo) => update({ automaticaTipo })}
                options={[
                  { value: 'numSacas', label: 'Por número de sacas' },
                  { value: 'maxPorSaca', label: 'Por tamaño máximo' },
                ]}
              />

              {value.automaticaTipo === 'numSacas' ? (
                <QuickPresetChips
                  options={numSacasPresets.map((preset) => ({
                    label: preset.label,
                    value: preset.value,
                    disabled: preset.disabled,
                    title: preset.title,
                  }))}
                  value={value.automaticaNumSacas}
                  onSelect={(automaticaNumSacas) =>
                    update({ automaticaNumSacas })
                  }
                />
              ) : (
                <div className="space-y-2">
                  <QuickPresetChips
                    options={maxPorSacaPresets.map((n) => ({
                      label: n === 1 ? '1 pkg' : `${n} pkg`,
                      value: n,
                    }))}
                    value={value.automaticaMaxPorSaca}
                    onSelect={(automaticaMaxPorSaca) =>
                      update({ automaticaMaxPorSaca })
                    }
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Máximo</span>
                    <Input
                      type="number"
                      min={1}
                      value={value.automaticaMaxPorSaca}
                      onChange={(e) =>
                        update({
                          automaticaMaxPorSaca: Math.max(
                            1,
                            parseInt(e.target.value, 10) || 1,
                          ),
                        })
                      }
                      className="h-8 w-20 font-mono text-sm"
                    />
                    <span className="text-muted-foreground">paquetes por saca</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {distribucionPreviewDetalle && distribucionPreviewDetalle.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Vista previa</span>
          <div className="flex flex-wrap gap-1.5">
            {distribucionPreviewDetalle.map((d, i) => {
              const pesoLabel =
                d.kg > 0 || d.lbs > 0
                  ? formatWeightFromValues(d.lbs, d.kg)
                  : null;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-2 py-0.5 text-xs"
                  title={pesoLabel ?? undefined}
                >
                  <span className="font-semibold text-[var(--color-primary)]">
                    Saca {i + 1}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-foreground">
                    {d.count} pkg{d.count === 1 ? '' : 's'}
                  </span>
                  {pesoLabel && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="whitespace-nowrap text-muted-foreground">
                        {pesoLabel}
                      </span>
                    </>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="inline-flex items-center gap-1.5 text-xs text-[var(--color-destructive)]">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      <p className="text-[11px] text-muted-foreground">
        El tamaño de cada saca se configura en su tarjeta después de crearlas.
      </p>
    </div>
  );
}
