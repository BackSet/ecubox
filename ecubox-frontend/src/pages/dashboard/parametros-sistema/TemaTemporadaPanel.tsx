import { useEffect, useMemo, useState } from 'react';
import { CalendarCog, CalendarOff, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectionCard } from '@/components/ui/selection-card';
import { SurfaceCardSkeleton } from '@/components/skeletons/SurfaceCardSkeleton';
import { SEASONS, computeRango, resolveSeasonByDate, type SeasonVentanas } from '@/data/seasons';
import { useTemaTemporada, useUpdateTemaTemporada } from '@/hooks/useTemaTemporada';
import type { TemaTemporada } from '@/lib/api/parametros-sistema.service';
import { getApiErrorMessage } from '@/lib/api/error-message';

const MAX_DIAS_ANTES = 120;
const MAX_DIAS_DESPUES = 60;

interface OpcionTema {
  id: string;
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
}

const OPCIONES_BASE: OpcionTema[] = [
  {
    id: 'auto',
    titulo: 'Automático (por fecha)',
    descripcion: 'El sitio activa cada temporada en sus fechas y vuelve al tema base fuera de ellas.',
    icono: <CalendarCog className="h-4 w-4" />,
  },
  {
    id: 'off',
    titulo: 'Desactivado',
    descripcion: 'Mantiene el tema base de marca todo el año, sin decoración de temporada.',
    icono: <CalendarOff className="h-4 w-4" />,
  },
];

interface VentanaEditable {
  diasAntes: number;
  diasDespues: number;
}

/** Combina las ventanas guardadas con los valores por defecto del código. */
function ventanasEfectivas(tema: TemaTemporada | undefined): Record<string, VentanaEditable> {
  const out: Record<string, VentanaEditable> = {};
  for (const s of SEASONS) {
    const cfg = tema?.ventanas?.[s.id];
    out[s.id] = {
      diasAntes: cfg?.diasAntes ?? s.diasAntes,
      diasDespues: cfg?.diasDespues ?? s.diasDespues,
    };
  }
  return out;
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

const fmtFecha = (d: Date) => d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });

export function TemaTemporadaPanel() {
  const { data, isLoading, error } = useTemaTemporada();
  const updateMutation = useUpdateTemaTemporada();

  const [seleccion, setSeleccion] = useState<string>('auto');
  const [ventanas, setVentanas] = useState<Record<string, VentanaEditable>>(() =>
    ventanasEfectivas(undefined),
  );

  useEffect(() => {
    if (data) {
      setSeleccion(data.override);
      setVentanas(ventanasEfectivas(data));
    }
  }, [data]);

  const opciones = useMemo<OpcionTema[]>(
    () => [
      ...OPCIONES_BASE,
      ...SEASONS.map((s) => ({
        id: s.id,
        titulo: s.nombre,
        descripcion: `Fuerza el tema “${s.nombre}” ${s.badge}`,
        icono: <Sparkles className="h-4 w-4" />,
      })),
    ],
    [],
  );

  // Vista previa con las ventanas en edición.
  const ventanasOverride = useMemo<SeasonVentanas>(() => ventanas, [ventanas]);
  const temporadaAuto = useMemo(
    () => resolveSeasonByDate(new Date(), ventanasOverride),
    [ventanasOverride],
  );

  const baseline = useMemo(
    () => JSON.stringify({ override: data?.override ?? 'auto', ventanas: ventanasEfectivas(data) }),
    [data],
  );
  const actual = JSON.stringify({ override: seleccion, ventanas });
  const dirty = actual !== baseline;

  function setVentana(id: string, patch: Partial<VentanaEditable>) {
    setVentanas((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function guardar() {
    try {
      await updateMutation.mutateAsync({ override: seleccion, ventanas });
      toast.success('Tema de temporada actualizado');
    } catch (e) {
      toast.error(getApiErrorMessage(e) ?? 'No se pudo guardar el tema de temporada');
    }
  }

  if (isLoading) {
    return <SurfaceCardSkeleton bodyLines={4} />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-4 text-sm text-[var(--color-destructive)]">
        No se pudo cargar el tema de temporada.
      </div>
    );
  }

  const anio = new Date().getFullYear();

  return (
    <div className="page-stack">
      {/* Modo de activación */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-sm font-semibold text-foreground">Tema de temporada</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Tematiza el landing y las páginas públicas (color de marca, badge, decoración y banner
            promocional) según días festivos. En modo automático las fechas se gestionan solas; aquí
            puedes forzar una temporada o desactivarlas.
          </p>

          {seleccion === 'auto' && (
            <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/15 px-3 py-2 text-[11px] text-muted-foreground">
              {temporadaAuto ? (
                <>
                  Ahora mismo se mostraría:{' '}
                  <span className="font-semibold text-foreground">{temporadaAuto.nombre}</span>.
                </>
              ) : (
                <>Hoy no hay ninguna temporada activa: se muestra el tema base.</>
              )}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {opciones.map((op) => (
              <SelectionCard
                key={op.id}
                selected={seleccion === op.id}
                icon={op.icono}
                title={op.titulo}
                description={op.descripcion}
                onClick={() => setSeleccion(op.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Configuración de ventanas por temporada */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Ventanas de activación</h3>
          <p className="text-xs text-muted-foreground">
            En modo automático, define con cuántos días de anticipación se activa cada tema y cuántos
            días sigue activo después del día festivo. Sube los “días antes” para dar más margen de
            envío.
          </p>
        </div>

        <div className="mt-3 space-y-2">
          {SEASONS.map((s) => {
            const v = ventanas[s.id];
            const rango = computeRango(s, anio, ventanas);
            const finInclusivo = new Date(rango.fin);
            finInclusivo.setDate(finInclusivo.getDate() - 1);
            return (
              <div
                key={s.id}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3"
              >
                <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                  <div className="min-w-[10rem] flex-1">
                    <p className="text-sm font-medium text-foreground">{s.nombre}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {anio}: {fmtFecha(rango.inicio)} → {fmtFecha(finInclusivo)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`antes-${s.id}`} className="text-[11px] text-muted-foreground">
                      Días antes
                    </Label>
                    <Input
                      id={`antes-${s.id}`}
                      type="number"
                      min={0}
                      max={MAX_DIAS_ANTES}
                      value={v.diasAntes}
                      onChange={(e) =>
                        setVentana(s.id, {
                          diasAntes: clamp(parseInt(e.target.value, 10), 0, MAX_DIAS_ANTES),
                        })
                      }
                      className="h-9 w-24"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`despues-${s.id}`} className="text-[11px] text-muted-foreground">
                      Días después
                    </Label>
                    <Input
                      id={`despues-${s.id}`}
                      type="number"
                      min={0}
                      max={MAX_DIAS_DESPUES}
                      value={v.diasDespues}
                      onChange={(e) =>
                        setVentana(s.id, {
                          diasDespues: clamp(parseInt(e.target.value, 10), 0, MAX_DIAS_DESPUES),
                        })
                      }
                      className="h-9 w-24"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={guardar} disabled={!dirty || updateMutation.isPending}>
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
