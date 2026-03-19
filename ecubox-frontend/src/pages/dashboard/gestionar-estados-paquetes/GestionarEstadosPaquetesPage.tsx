import { useState, useMemo, useCallback } from 'react';
import { usePaquetesSinSaca } from '@/hooks/useOperarioDespachos';
import { useCambiarEstadoRastreoBulk, useEstadosDestinoPermitidos, useLiberarIncidenciaPaquete } from '@/hooks/usePaquetesOperario';
import { useEstadosRastreoActivos } from '@/hooks/useEstadosRastreo';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tag } from 'lucide-react';
import { toast } from 'sonner';

export function GestionarEstadosPaquetesPage() {
  const { data: paquetes, isLoading, error } = usePaquetesSinSaca();
  const { data: estadosRastreo = [] } = useEstadosRastreoActivos();
  const cambiarEstadoBulk = useCambiarEstadoRastreoBulk();
  const liberarIncidencia = useLiberarIncidenciaPaquete();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [estadoId, setEstadoId] = useState<string>('');
  const idsSeleccionados = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const { data: estadosPermitidos = [] } = useEstadosDestinoPermitidos(idsSeleccionados);

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

  const toggleSelected = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const visibleIds = list.map((p) => p.id);
    setSelectedIds((prev) => {
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      if (allSelected) return new Set([...prev].filter((id) => !visibleIds.includes(id)));
      return new Set([...prev, ...visibleIds]);
    });
  }, [list]);

  const handleAplicar = useCallback(async () => {
    const id = estadoId === '' ? null : Number(estadoId);
    if (id == null || Number.isNaN(id)) {
      toast.error('Selecciona un estado');
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error('Selecciona al menos un paquete');
      return;
    }
    try {
      const res = await cambiarEstadoBulk.mutateAsync({ paqueteIds: ids, estadoRastreoId: id });
      if (res.rechazados.length > 0) {
        const motivos = res.rechazados.map((r) => `#${r.paqueteId}: ${r.motivo}`).join('; ');
        toast.warning(`${res.actualizados} actualizado(s). Rechazados: ${res.rechazados.length}. ${motivos}`);
      } else {
        toast.success(`${res.actualizados} paquete(s) actualizado(s)`);
      }
      setSelectedIds(new Set());
    } catch {
      toast.error('Error al aplicar estado');
    }
  }, [estadoId, selectedIds, cambiarEstadoBulk]);

  const handleLiberar = useCallback(async (paqueteId: number) => {
    try {
      await liberarIncidencia.mutateAsync({ paqueteId });
      toast.success('Incidencia liberada');
    } catch {
      toast.error('No se pudo liberar la incidencia');
    }
  }, [liberarIncidencia]);

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
        title="Gestionar estados de paquetes"
        searchPlaceholder="Buscar por guía, ref, destinatario..."
        onSearchChange={setSearch}
        actions={
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 opacity-70" aria-hidden />
            <Select value={estadoId} onValueChange={setEstadoId}>
              <SelectTrigger className="min-w-[200px]" aria-label="Estado a aplicar">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {(idsSeleccionados.length > 0 ? estadosPermitidos : estadosRastreo).map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAplicar}
              disabled={cambiarEstadoBulk.isPending || selectedIds.size === 0 || !estadoId}
            >
              {cambiarEstadoBulk.isPending ? 'Aplicando...' : `Aplicar estado (${selectedIds.size})`}
            </Button>
          </div>
        }
      />

      <p className="text-sm text-[var(--color-muted-foreground)]">
        Solo se listan paquetes sin despacho. Puedes asignar un estado a los seleccionados. Los paquetes que estén en un
        lote de recepción serán rechazados al aplicar.
      </p>
      {idsSeleccionados.length > 0 && (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Se muestran solo estados destino permitidos para los paquetes seleccionados.
        </p>
      )}

      {allPaquetes.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No hay paquetes sin saca"
          description="Todos los paquetes tienen saca asignada o no hay paquetes."
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Sin resultados"
          description="No hay paquetes que coincidan con la búsqueda."
        />
      ) : (
        <div className="surface-card overflow-hidden p-0">
          <table className="compact-table">
            <thead>
              <tr>
                <th className="w-10">
                  <Checkbox
                    checked={list.length > 0 && list.every((p) => selectedIds.has(p.id))}
                    onCheckedChange={toggleAll}
                    aria-label="Seleccionar todos"
                  />
                </th>
                <th>Ref</th>
                <th>Guía</th>
                <th>Guía de envío</th>
                <th>Destinatario</th>
                <th>Estado actual</th>
                <th>Flujo</th>
                <th className="text-right">Incidencia</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="text-center">
                    <Checkbox
                      checked={selectedIds.has(p.id)}
                      onCheckedChange={() => toggleSelected(p.id)}
                      aria-label={`Seleccionar ${p.numeroGuia}`}
                    />
                  </td>
                  <td className="font-mono text-sm">{p.ref ?? '—'}</td>
                  <td className="font-medium">{p.numeroGuia}</td>
                  <td>{p.numeroGuiaEnvio ?? '—'}</td>
                  <td>{p.destinatarioNombre ?? '—'}</td>
                  <td>{p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}</td>
                  <td>{p.enFlujoAlterno ? 'Alterno' : 'Normal'}</td>
                  <td className="text-right">
                    {p.bloqueado ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleLiberar(p.id)}
                        disabled={liberarIncidencia.isPending}
                      >
                        Liberar
                      </Button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
