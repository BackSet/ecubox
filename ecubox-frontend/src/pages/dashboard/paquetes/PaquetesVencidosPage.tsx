import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePaquetesVencidosOperario } from '@/hooks/usePaquetesOperario';

export function PaquetesVencidosPage() {
  const { data: paquetes, isLoading, error } = usePaquetesVencidosOperario(true);
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const raw = paquetes ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (p) =>
        p.numeroGuia?.toLowerCase().includes(q) ||
        (p.destinatarioNombre?.toLowerCase().includes(q) ?? false) ||
        (p.estadoRastreoNombre?.toLowerCase().includes(q) ?? false)
    );
  }, [paquetes, search]);

  if (isLoading) {
    return <LoadingState text="Cargando paquetes vencidos..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar paquetes vencidos.
      </div>
    );
  }

  const allPaquetes = paquetes ?? [];

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Paquetes vencidos de retiro"
        searchPlaceholder="Buscar por guía, destinatario o estado..."
        onSearchChange={setSearch}
      />

      {allPaquetes.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Sin paquetes vencidos"
          description="No hay paquetes que hayan superado el plazo máximo de retiro."
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Sin resultados"
          description="No se encontraron paquetes vencidos con ese criterio."
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[920px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead>Número de guía</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Estado actual</TableHead>
                <TableHead>Días transcurridos</TableHead>
                <TableHead>Días máximos</TableHead>
                <TableHead>Atraso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <a
                      href={`/tracking?numeroGuia=${encodeURIComponent(p.numeroGuia)}`}
                      className="text-primary hover:underline"
                    >
                      {p.numeroGuia}
                    </a>
                  </TableCell>
                  <TableCell>{p.destinatarioNombre ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.diasTranscurridos ?? '—'}</TableCell>
                  <TableCell>{p.diasMaxRetiro ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      {p.diasAtrasoRetiro ?? 0} día(s)
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListTableShell>
      )}
    </div>
  );
}
