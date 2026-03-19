import { useState, useCallback, useMemo } from 'react';
import { usePaquetesOperario, useBulkUpdatePesos, useAsignarGuiaEnvio } from '@/hooks/usePaquetesOperario';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Weight } from 'lucide-react';
import { toast } from 'sonner';
import { lbsToKg, kgToLbs } from '@/lib/utils/weight';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import type { Paquete } from '@/types/paquete';

type WeightInputs = Record<number, { lbs: string; kg: string }>;

function getWeightState(
  state: WeightInputs,
  id: number
): { lbs: string; kg: string } {
  return state[id] ?? { lbs: '', kg: '' };
}

export function CargarPesosPage() {
  const { data: paquetes, isLoading, error } = usePaquetesOperario(true);
  const bulkUpdate = useBulkUpdatePesos();
  const asignarGuiaEnvio = useAsignarGuiaEnvio();
  const [weights, setWeights] = useState<WeightInputs>({});
  const [editingGuiaEnvioId, setEditingGuiaEnvioId] = useState<number | null>(null);
  const [guiaEnvioDraft, setGuiaEnvioDraft] = useState<string>('');
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const raw = paquetes ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (p) =>
        p.ref?.toLowerCase().includes(q) ||
        p.numeroGuia?.toLowerCase().includes(q) ||
        (p.numeroGuiaEnvio?.toLowerCase().includes(q) ?? false) ||
        (p.destinatarioNombre?.toLowerCase().includes(q) ?? false) ||
        (p.contenido?.toLowerCase().includes(q) ?? false)
    );
  }, [paquetes, search]);

  const setLbs = useCallback((id: number, value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    const n = sanitized === '' ? NaN : Number(sanitized);
    const kgStr =
      !Number.isNaN(n) && n >= 0 ? String(lbsToKg(n)) : '';
    setWeights((prev) => ({
      ...prev,
      [id]: { lbs: sanitized, kg: kgStr },
    }));
  }, []);

  const setKg = useCallback((id: number, value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    const n = sanitized === '' ? NaN : Number(sanitized);
    const lbsStr =
      !Number.isNaN(n) && n >= 0 ? String(kgToLbs(n)) : '';
    setWeights((prev) => ({
      ...prev,
      [id]: { lbs: lbsStr, kg: sanitized },
    }));
  }, []);

  const handleGuardar = useCallback(async () => {
    const all = paquetes ?? [];
    const items = all
      .map((p: Paquete) => {
        const w = getWeightState(weights, p.id);
        const lbs = w.lbs.trim() === '' ? undefined : Number(w.lbs);
        const kg = w.kg.trim() === '' ? undefined : Number(w.kg);
        const hasLbs = lbs != null && !Number.isNaN(lbs) && lbs > 0;
        const hasKg = kg != null && !Number.isNaN(kg) && kg > 0;
        if (!hasLbs && !hasKg) return null;
        return {
          paqueteId: p.id,
          ...(hasLbs && { pesoLbs: lbs }),
          ...(hasKg && { pesoKg: kg }),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    if (items.length === 0) {
      toast.error('Ingresa al menos un peso en alguna fila');
      return;
    }

    try {
      await bulkUpdate.mutateAsync(items);
      toast.success(`Pesos actualizados: ${items.length} paquete(s)`);
      setWeights((prev) => {
        const next = { ...prev };
        items.forEach((i) => delete next[i.paqueteId]);
        return next;
      });
    } catch {
      toast.error('Error al guardar los pesos');
    }
  }, [paquetes, weights, bulkUpdate]);

  const handleGuiaEnvioBlur = useCallback(
    (paqueteId: number) => {
      setEditingGuiaEnvioId(null);
      const value = guiaEnvioDraft.trim() || null;
      const p = paquetes?.find((x) => x.id === paqueteId);
      if (!p || (value === (p.numeroGuiaEnvio ?? null))) return;
      asignarGuiaEnvio.mutate(
        { paqueteId, numeroGuiaEnvio: value },
        {
          onSuccess: () => toast.success('Guía de envío actualizada'),
          onError: () => toast.error('Error al actualizar guía de envío'),
        }
      );
    },
    [guiaEnvioDraft, paquetes, asignarGuiaEnvio]
  );

  const startEditGuiaEnvio = useCallback((p: Paquete) => {
    setEditingGuiaEnvioId(p.id);
    setGuiaEnvioDraft(p.numeroGuiaEnvio ?? '');
  }, []);

  const allPaquetes = paquetes ?? [];

  if (isLoading) {
    return <LoadingState text="Cargando paquetes..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar paquetes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Cargar pesos"
        searchPlaceholder="Buscar por guía, guía de envío, destinatario, contenido..."
        onSearchChange={setSearch}
        actions={
          <Button
            onClick={handleGuardar}
            disabled={bulkUpdate.isPending || allPaquetes.length === 0}
          >
            {bulkUpdate.isPending ? 'Guardando...' : 'Guardar pesos'}
          </Button>
        }
      />

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
        <ListTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Guía</TableHead>
                <TableHead>Guía de envío</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Contenido</TableHead>
                <TableHead>Estado rastreo</TableHead>
                <TableHead>Peso (lbs)</TableHead>
                <TableHead>Peso (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => {
                const w = getWeightState(weights, p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.ref ?? '—'}</TableCell>
                    <TableCell className="font-medium">{p.numeroGuia}</TableCell>
                    <TableCell>
                      {editingGuiaEnvioId === p.id ? (
                        <Input
                          type="text"
                          value={guiaEnvioDraft}
                          onChange={(e) => setGuiaEnvioDraft(e.target.value)}
                          onBlur={() => handleGuiaEnvioBlur(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          }}
                          autoFocus
                          className="h-8 w-32"
                          placeholder="Guía consolidador"
                        />
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditGuiaEnvio(p)}
                          className="h-7 w-full justify-start px-1 text-sm"
                        >
                          {p.numeroGuiaEnvio ?? '—'}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>{p.destinatarioNombre ?? '—'}</TableCell>
                    <TableCell>{p.contenido ?? '—'}</TableCell>
                    <TableCell>{p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}</TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={w.lbs}
                        onChange={(e) => setLbs(p.id, e.target.value)}
                        onKeyDown={(e) => onKeyDownNumericDecimal(e, w.lbs)}
                        className="h-8 w-24"
                        placeholder="—"
                        aria-label={`Peso en lbs para ${p.numeroGuia}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={w.kg}
                        onChange={(e) => setKg(p.id, e.target.value)}
                        onKeyDown={(e) => onKeyDownNumericDecimal(e, w.kg)}
                        className="h-8 w-24"
                        placeholder="—"
                        aria-label={`Peso en kg para ${p.numeroGuia}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ListTableShell>
      )}
    </div>
  );
}
