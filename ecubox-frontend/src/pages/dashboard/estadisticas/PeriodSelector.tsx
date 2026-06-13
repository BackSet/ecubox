import { useEffect, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import type { GranularidadEstadisticas } from '@/types/estadisticas';
import {
  GRANULARIDAD_LABEL,
  PRESET_OPTIONS,
  type EstadisticasSearch,
  type PresetSlug,
} from './periodo';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const SELECT_CLASS =
  'h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[13px] text-[var(--color-foreground)]';

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

interface PeriodSelectorProps {
  value: EstadisticasSearch;
  onChange: (next: EstadisticasSearch) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const now = new Date();
  const [desdeDraft, setDesdeDraft] = useState(value.desde ?? isoDaysAgo(30));
  const [hastaDraft, setHastaDraft] = useState(value.hasta ?? isoToday());

  useEffect(() => {
    if (value.preset === 'rango') {
      setDesdeDraft(value.desde ?? isoDaysAgo(30));
      setHastaDraft(value.hasta ?? isoToday());
    }
  }, [value.preset, value.desde, value.hasta]);

  function handlePreset(slug: PresetSlug) {
    if (slug === 'mes') {
      onChange({
        preset: 'mes',
        anio: value.anio ?? now.getFullYear(),
        mes: value.mes ?? now.getMonth() + 1,
        gran: value.gran,
      });
      return;
    }
    if (slug === 'rango') {
      onChange({
        preset: 'rango',
        desde: value.desde ?? isoDaysAgo(30),
        hasta: value.hasta ?? isoToday(),
        gran: value.gran,
      });
      return;
    }
    onChange({ preset: slug, gran: value.gran });
  }

  function handleGran(raw: string) {
    const gran = raw === 'auto' ? undefined : (raw as GranularidadEstadisticas);
    onChange({ ...value, gran });
  }

  const today = isoToday();
  const rangoInvalido =
    value.preset === 'rango' && (desdeDraft > hastaDraft || hastaDraft > today);

  function commitRango(nextDesde: string, nextHasta: string) {
    if (nextDesde <= nextHasta && nextHasta <= today) {
      onChange({ preset: 'rango', desde: nextDesde, hasta: nextHasta, gran: value.gran });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-[13px] text-[var(--color-muted-foreground)]">
          <CalendarRange className="h-4 w-4" />
          Período
          <select
            value={value.preset}
            onChange={(event) => handlePreset(event.target.value as PresetSlug)}
            className={SELECT_CLASS}
          >
            {PRESET_OPTIONS.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {value.preset === 'mes' && (
          <>
            <select
              aria-label="Mes"
              value={value.mes ?? now.getMonth() + 1}
              onChange={(event) =>
                onChange({ ...value, preset: 'mes', mes: Number(event.target.value) })
              }
              className={SELECT_CLASS}
            >
              {MESES.map((nombre, index) => (
                <option key={nombre} value={index + 1}>
                  {nombre}
                </option>
              ))}
            </select>
            <select
              aria-label="Año"
              value={value.anio ?? now.getFullYear()}
              onChange={(event) =>
                onChange({ ...value, preset: 'mes', anio: Number(event.target.value) })
              }
              className={SELECT_CLASS}
            >
              {Array.from({ length: 6 }, (_, i) => now.getFullYear() - i).map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
          </>
        )}

        {value.preset === 'rango' && (
          <>
            <input
              type="date"
              aria-label="Desde"
              value={desdeDraft}
              max={today}
              onChange={(event) => {
                setDesdeDraft(event.target.value);
                commitRango(event.target.value, hastaDraft);
              }}
              className={SELECT_CLASS}
            />
            <span className="text-[13px] text-[var(--color-muted-foreground)]">a</span>
            <input
              type="date"
              aria-label="Hasta"
              value={hastaDraft}
              max={today}
              onChange={(event) => {
                setHastaDraft(event.target.value);
                commitRango(desdeDraft, event.target.value);
              }}
              className={SELECT_CLASS}
            />
          </>
        )}

        <select
          aria-label="Granularidad"
          value={value.gran ?? 'auto'}
          onChange={(event) => handleGran(event.target.value)}
          className={SELECT_CLASS}
        >
          <option value="auto">Granularidad: automática</option>
          {(Object.keys(GRANULARIDAD_LABEL) as GranularidadEstadisticas[]).map((g) => (
            <option key={g} value={g}>
              {GRANULARIDAD_LABEL[g]}
            </option>
          ))}
        </select>
      </div>

      {rangoInvalido && (
        <p className="text-[12px] text-[var(--color-destructive)]">
          Revisa el rango: «desde» debe ser anterior o igual a «hasta» y no puede incluir fechas
          futuras.
        </p>
      )}
    </div>
  );
}
