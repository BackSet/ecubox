import { useState, useMemo } from 'react';
import { usePermisos } from '@/hooks/usePermisos';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Key } from 'lucide-react';

export function PermisoList() {
  const { data: permisos, isLoading, error } = usePermisos();
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const raw = permisos ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (p) =>
        p.codigo?.toLowerCase().includes(q) ||
        (p.descripcion?.toLowerCase().includes(q) ?? false)
    );
  }, [permisos, search]);

  if (isLoading) {
    return <LoadingState text="Cargando permisos..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar permisos.
      </div>
    );
  }

  const allPermisos = permisos ?? [];

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Permisos"
        searchPlaceholder="Buscar por código o descripción..."
        onSearchChange={setSearch}
      />
      {list.length === 0 ? (
        <EmptyState
          icon={Key}
          title={allPermisos.length === 0 ? 'No hay permisos' : 'Sin resultados'}
          description={
            allPermisos.length === 0
              ? 'Los permisos se gestionan desde el backend.'
              : 'No se encontraron permisos con ese criterio.'
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.codigo}</TableCell>
                  <TableCell>{p.descripcion ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListTableShell>
      )}
    </div>
  );
}
