import { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eraser,
  PackageX,
  Save,
  Scale,
  Weight,
} from 'lucide-react';
import { toast } from 'sonner';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { KpiCard } from '@/components/KpiCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBulkUpdatePesos, usePaquetesOperario } from '@/hooks/usePaquetesOperario';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { kgToLbs, lbsToKg } from '@/lib/utils/weight';
import type { Paquete } from '@/types/paquete';
import { DestinatarioCell, GuiaMasterPiezaCell } from '../paquetes/PaqueteCells';

type WeightInputs = Record<number, { lbs: string; kg: string }>;

function getWeightState(state: WeightInputs, id: number): { lbs: string; kg: string } {
  return state[id] ?? { lbs: '', kg: '' };
}

function parsePositive(value: string): number | null {
  if (!value || !value.trim()) return null;
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

export function CargarPesosPage() {
  const { data: paquetes, isLoading, error } = usePaquetesOperario(true);
  const bulkUpdate = useBulkUpdatePesos();
  const [weights, setWeights] = useState<WeightInputs>({});
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const raw = paquetes ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (p) =>
        p.ref?.toLowerCase().includes(q) ||
        p.numeroGuia?.toLowerCase().includes(q) ||
        (p.guiaMasterTrackingBase?.toLowerCase().includes(q) ?? false) ||
        (p.destinatarioNombre?.toLowerCase().includes(q) ?? false) ||
        (p.contenido?.toLowerCase().includes(q) ?? false),
    );
  }, [paquetes, search]);

  const setLbs = useCallback((id: number, value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    const n = sanitized === '' ? NaN : Number(sanitized);
    const kgStr = !Number.isNaN(n) && n >= 0 ? String(lbsToKg(n)) : '';
    setWeights((prev) => ({
      ...prev,
      [id]: { lbs: sanitized, kg: kgStr },
    }));
  }, []);

  const setKg = useCallback((id: number, value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    const n = sanitized === '' ? NaN : Number(sanitized);
    const lbsStr = !Number.isNaN(n) && n >= 0 ? String(kgToLbs(n)) : '';
    setWeights((prev) => ({
      ...prev,
      [id]: { lbs: lbsStr, kg: sanitized },
    }));
  }, []);

  const clearRow = useCallback((id: number) => {
    setWeights((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setWeights({});
  }, []);

  const stats = useMemo(() => {
    const all = paquetes ?? [];
    let listos = 0;
    let pendientesConValor = 0;
    let pesoLbsTotal = 0;
    for (const p of all) {
      const w = getWeightState(weights, p.id);
      const lbs = parsePositive(w.lbs);
      const kg = parsePositive(w.kg);
      if (lbs != null || kg != null) {
        listos += 1;
        if (lbs != null) pesoLbsTotal += lbs;
      }
      if (w.lbs.trim() !== '' || w.kg.trim() !== '') {
        if (lbs == null && kg == null) pendientesConValor += 1;
      }
    }
    return {
      pendientes: all.length,
      listos,
      invalidos: pendientesConValor,
      pesoLbsTotal,
    };
  }, [paquetes, weights]);

  const handleGuardar = useCallback(async () => {
    const all = paquetes ?? [];
    const items = all
      .map((p: Paquete) => {
        const w = getWeightState(weights, p.id);
        const lbs = parsePositive(w.lbs);
        const kg = parsePositive(w.kg);
        if (lbs == null && kg == null) return null;
        return {
          paqueteId: p.id,
          ...(lbs != null && { pesoLbs: lbs }),
          ...(kg != null && { pesoKg: kg }),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    if (items.length === 0) {
      toast.error('Ingresa al menos un peso válido en alguna fila');
      return;
    }

    try {
      await bulkUpdate.mutateAsync(items);
      toast.success(
        `Pesos actualizados: ${items.length} paquete${items.length === 1 ? '' : 's'}`,
      );
      setWeights((prev) => {
        const next = { ...prev };
        items.forEach((i) => delete next[i.paqueteId]);
        return next;
      });
    } catch {
      toast.error('Error al guardar los pesos');
    }
  }, [paquetes, weights, bulkUpdate]);

  if (isLoading) {
    return <LoadingState text="Cargando paquetes..." />;
  }
  if (error) {
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar paquetes.
      </div>
    );
  }

  const allPaquetes = paquetes ?? [];
  const hayCambios = stats.listos > 0 || stats.invalidos > 0;

  return (
    <div className="page-stack">
      <ListToolbar
        title="Cargar pesos"
        searchPlaceholder="Buscar por ref, guía, destinatario o contenido..."
        onSearchChange={setSearch}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {hayCambios && (
              <Button
                type="button"
                variant="secondary"
                onClick={clearAll}
                disabled={bulkUpdate.isPending}
                className="w-full sm:w-auto"
              >
                <Eraser className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            )}
            <Button
              onClick={handleGuardar}
              disabled={bulkUpdate.isPending || stats.listos === 0}
              className="w-full sm:w-auto"
            >
              <Save className="mr-2 h-4 w-4" />
              {bulkUpdate.isPending
                ? 'Guardando...'
                : stats.listos > 0
                  ? `Guardar ${stats.listos} peso${stats.listos === 1 ? '' : 's'}`
                  : 'Guardar pesos'}
            </Button>
          </div>
        }
      />

      {allPaquetes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<PackageX className="h-5 w-5" />}
            label="Sin peso"
            value={stats.pendientes}
            tone="neutral"
          />
          <KpiCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Listos para guardar"
            value={stats.listos}
            tone={stats.listos > 0 ? 'success' : 'neutral'}
          />
          <KpiCard
            icon={<AlertCircle className="h-5 w-5" />}
            label="Filas inválidas"
            value={stats.invalidos}
            tone={stats.invalidos > 0 ? 'danger' : 'neutral'}
          />
          <KpiCard
            icon={<Scale className="h-5 w-5" />}
            label="Total a registrar"
            value={
              stats.pesoLbsTotal > 0 ? `${stats.pesoLbsTotal.toFixed(2)} lbs` : '—'
            }
            tone="primary"
          />
        </div>
      )}

      {allPaquetes.length === 0 ? (
        <EmptyState
          icon={Weight}
          title="No hay paquetes sin peso"
          description="Todos los paquetes registrados ya tienen peso cargado, o no hay paquetes."
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Weight}
          title="Sin resultados"
          description="No hay paquetes que coincidan con la búsqueda."
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {list.length} paquete{list.length === 1 ? '' : 's'} sin peso
            {list.length !== allPaquetes.length ? ` de ${allPaquetes.length}` : ''}
            {' · escribe en lbs o kg, la otra unidad se calcula automáticamente.'}
          </p>
          <ListTableShell>
            <Table className="min-w-[960px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[14rem]">Ref / Guía</TableHead>
                  <TableHead className="min-w-[14rem]">Destinatario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Contenido</TableHead>
                  <TableHead className="w-[10rem]">Peso (lbs)</TableHead>
                  <TableHead className="w-[10rem]">Peso (kg)</TableHead>
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => {
                  const w = getWeightState(weights, p.id);
                  const lbsValue = parsePositive(w.lbs);
                  const kgValue = parsePositive(w.kg);
                  const tieneAlgo = w.lbs.trim() !== '' || w.kg.trim() !== '';
                  const valido = lbsValue != null || kgValue != null;
                  const invalido = tieneAlgo && !valido;

                  return (
                    <TableRow
                      key={p.id}
                      className={
                        invalido
                          ? 'bg-[var(--color-destructive)]/5'
                          : valido
                            ? 'bg-[var(--color-success)]/5'
                            : undefined
                      }
                    >
                      <TableCell className="max-w-[14rem] align-top">
                        <GuiaMasterPiezaCell paquete={p} />
                        {p.ref && (
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                            {p.ref}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[18rem] align-top">
                        <DestinatarioCell paquete={p} />
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="secondary" className="font-normal">
                          {p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[16rem] align-top text-sm text-muted-foreground">
                        <span className="line-clamp-2 break-words">{p.contenido ?? '—'}</span>
                      </TableCell>
                      <TableCell className="align-top">
                        <PesoInput
                          value={w.lbs}
                          onChange={(v) => setLbs(p.id, v)}
                          unit="lbs"
                          ariaLabel={`Peso en libras para ${p.numeroGuia}`}
                          highlight={valido}
                          invalid={invalido && w.lbs.trim() !== ''}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <PesoInput
                          value={w.kg}
                          onChange={(v) => setKg(p.id, v)}
                          unit="kg"
                          ariaLabel={`Peso en kilogramos para ${p.numeroGuia}`}
                          highlight={valido}
                          invalid={invalido && w.kg.trim() !== ''}
                        />
                      </TableCell>
                      <TableCell className="text-right align-top">
                        {tieneAlgo && (
                          <button
                            type="button"
                            onClick={() => clearRow(p.id)}
                            aria-label="Limpiar fila"
                            title="Limpiar fila"
                            className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-[var(--color-muted)] hover:text-foreground"
                          >
                            <Eraser className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ListTableShell>
        </>
      )}
    </div>
  );
}

interface PesoInputProps {
  value: string;
  onChange: (value: string) => void;
  unit: 'lbs' | 'kg';
  ariaLabel: string;
  highlight?: boolean;
  invalid?: boolean;
}

function PesoInput({ value, onChange, unit, ariaLabel, highlight, invalid }: PesoInputProps) {
  const borderClass = invalid
    ? 'border-[var(--color-destructive)] focus-within:ring-[var(--color-destructive)]/40'
    : highlight
      ? 'border-[var(--color-success)]/30 focus-within:ring-emerald-500/30'
      : '';
  return (
    <div
      className={`flex h-9 items-center overflow-hidden rounded-md border bg-background ${borderClass}`}
    >
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => onKeyDownNumericDecimal(e, value)}
        placeholder="0.00"
        aria-label={ariaLabel}
        className="h-9 flex-1 border-0 px-2 text-sm shadow-none focus-visible:ring-0"
      />
      <span className="select-none border-l border-border bg-[var(--color-muted)]/40 px-2 text-xs font-medium text-muted-foreground">
        {unit}
      </span>
    </div>
  );
}

