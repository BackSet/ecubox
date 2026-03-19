import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useLotesRecepcion } from '@/hooks/useLotesRecepcion';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { ListTableShell } from '@/components/ListTableShell';
import { Button } from '@/components/ui/button';
import { PackageCheck, Plus } from 'lucide-react';

function formatFecha(s: string | undefined): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return s;
  }
}

export function LoteRecepcionListPage() {
  const { data: lotes, isLoading, error } = useLotesRecepcion();
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const raw = lotes ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (l) =>
        l.observaciones?.toLowerCase().includes(q) ||
        l.operarioNombre?.toLowerCase().includes(q) ||
        l.numeroGuiasEnvio?.some((g) => g.toLowerCase().includes(q))
    );
  }, [lotes, search]);

  if (isLoading) {
    return <LoadingState text="Cargando lotes de recepción..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar lotes de recepción.
      </div>
    );
  }

  const allLotes = lotes ?? [];

  return (
    <div className="space-y-6">
      <ListToolbar
        title="Lotes de recepción"
        searchPlaceholder="Buscar por observaciones, operario, guía..."
        onSearchChange={setSearch}
        actions={
          <Link to="/lotes-recepcion/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar nuevo lote
            </Button>
          </Link>
        }
      />

      {allLotes.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="No hay lotes de recepción"
          description="Registre un lote desde el botón «Registrar nuevo lote». Solo se incluirán las guías que tengan paquetes en el sistema."
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Sin resultados"
          description="No hay lotes que coincidan con la búsqueda."
        />
      ) : (
        <ListTableShell>
            <table className="compact-table min-w-[860px] text-left">
              <thead>
                <tr>
                  <th>Fecha recepción</th>
                  <th>Observaciones</th>
                  <th>Operario</th>
                  <th className="text-right">Guías</th>
                  <th className="text-right">Paquetes</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((l) => (
                  <tr key={l.id}>
                    <td className="font-medium">{formatFecha(l.fechaRecepcion)}</td>
                    <td className="text-muted-foreground max-w-[200px] truncate" title={l.observaciones ?? ''}>
                      {l.observaciones ? (l.observaciones.length > 50 ? l.observaciones.slice(0, 50) + '…' : l.observaciones) : '—'}
                    </td>
                    <td>{l.operarioNombre ?? '—'}</td>
                    <td className="text-right">{l.numeroGuiasEnvio?.length ?? 0}</td>
                    <td className="text-right">{l.totalPaquetes ?? '—'}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end">
                        <RowActionsMenu
                          items={[
                            { label: 'Ver detalle', onSelect: () => { window.location.href = `/lotes-recepcion/${l.id}`; } },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </ListTableShell>
      )}
    </div>
  );
}
