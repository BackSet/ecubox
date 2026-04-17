import { useState, useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  useDespachos,
  useDeleteDespacho,
  useMensajeWhatsAppDespachoGenerado,
  useAplicarEstadoPorPeriodo,
} from '@/hooks/useOperarioDespachos';
import { useMensajeWhatsAppDespacho } from '@/hooks/useMensajeWhatsAppDespacho';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Truck, Copy, Tag } from 'lucide-react';
import { toast } from 'sonner';
import type { TipoEntrega } from '@/types/despacho';
import { getApiErrorMessage } from '@/lib/api/error-message';

const TIPO_LABELS: Record<TipoEntrega, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_DISTRIBUIDOR: 'Agencia de distribuidor',
};

export function DespachoListPage() {
  const navigate = useNavigate();
  const { data: despachos, isLoading, error } = useDespachos();
  const { data: mensajeWhatsApp } = useMensajeWhatsAppDespacho();
  const deleteMutation = useDeleteDespacho();
  const aplicarEstadoPorPeriodo = useAplicarEstadoPorPeriodo();
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [whatsappDespachoId, setWhatsappDespachoId] = useState<number | null>(null);
  const [estadoPorPeriodoOpen, setEstadoPorPeriodoOpen] = useState(false);
  const [periodoFechaInicio, setPeriodoFechaInicio] = useState('');
  const [periodoFechaFin, setPeriodoFechaFin] = useState('');

  const { data: mensajeGenerado, isLoading: loadingMensaje } = useMensajeWhatsAppDespachoGenerado(
    whatsappDespachoId ?? 0,
    whatsappDespachoId != null
  );

  const handleCopyMensaje = () => {
    const text = mensajeGenerado?.mensaje ?? '';
    if (!text) return;
    void navigator.clipboard.writeText(text).then(() => toast.success('Mensaje copiado'));
  };

  const handleAplicarEstadoPorPeriodo = async () => {
    if (!periodoFechaInicio || !periodoFechaFin) {
      toast.error('Indica fecha de inicio y fin');
      return;
    }
    try {
      const res = await aplicarEstadoPorPeriodo.mutateAsync({
        fechaInicio: periodoFechaInicio,
        fechaFin: periodoFechaFin,
      });
      toast.success(
        `Estado aplicado: ${res.despachosProcesados} despacho(s), ${res.paquetesActualizados} paquete(s) actualizado(s).`
      );
      setEstadoPorPeriodoOpen(false);
      setPeriodoFechaInicio('');
      setPeriodoFechaFin('');
    } catch {
      toast.error('Error al aplicar estado por periodo');
    }
  };

  const list = useMemo(() => {
    const raw = despachos ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (d) =>
        d.numeroGuia?.toLowerCase().includes(q) ||
        d.distribuidorNombre?.toLowerCase().includes(q) ||
        d.destinatarioNombre?.toLowerCase().includes(q) ||
        d.agenciaNombre?.toLowerCase().includes(q)
    );
  }, [despachos, search]);

  if (isLoading) {
    return <LoadingState text="Cargando despachos..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar despachos.
      </div>
    );
  }

  const allDespachos = despachos ?? [];

  const plantilla = mensajeWhatsApp?.plantilla ?? '';

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Despachos"
        searchPlaceholder="Buscar por guía, distribuidor, destinatario..."
        onSearchChange={setSearch}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEstadoPorPeriodoOpen(true)}
              className="w-full gap-2 sm:w-auto"
            >
              <Tag className="h-4 w-4" />
              Aplicar estado por periodo
            </Button>
            <Link to="/despachos/nuevo" className={cn(buttonVariants(), 'w-full sm:w-auto')}>
              Nuevo despacho
            </Link>
          </div>
        }
      />

      {allDespachos.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No hay despachos"
          description="Crea un despacho para asignar sacas y enviar con un distribuidor."
          action={
            <Link to="/despachos/nuevo" className={cn(buttonVariants())}>
              Nuevo despacho
            </Link>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Sin resultados"
          description="No hay despachos que coincidan con la búsqueda."
        />
      ) : (
        <ListTableShell>
          <Table className="table-mobile-cards min-w-[880px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead>Guía</TableHead>
                <TableHead>Distribuidor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Sacas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((d) => (
                <TableRow key={d.id}>
                  <TableCell data-label="Guía" className="font-medium">{d.numeroGuia}</TableCell>
                  <TableCell data-label="Distribuidor">{d.distribuidorNombre ?? '—'}</TableCell>
                  <TableCell data-label="Tipo">
                    <Badge variant="secondary">
                      {TIPO_LABELS[d.tipoEntrega] ?? d.tipoEntrega}
                    </Badge>
                  </TableCell>
                  <TableCell data-label="Destino">
                    {d.tipoEntrega === 'DOMICILIO'
                      ? (d.destinatarioNombre ?? '—')
                      : d.tipoEntrega === 'AGENCIA_DISTRIBUIDOR'
                        ? (d.agenciaDistribuidorNombre ?? '—')
                        : (d.agenciaNombre ?? '—')}
                  </TableCell>
                  <TableCell data-label="Sacas">{d.sacaIds?.length ?? 0}</TableCell>
                  <TableCell data-label="Acciones" className="text-right md:text-right">
                    <div className="flex items-center justify-end md:justify-end">
                      <RowActionsMenu
                        items={[
                          { label: 'Ver detalle / imprimir', onSelect: () => { navigate({ to: '/despachos/$id', params: { id: String(d.id) } }); } },
                          { label: 'Editar', onSelect: () => { navigate({ to: '/despachos/$id/editar', params: { id: String(d.id) } }); } },
                          ...(plantilla ? [{ label: 'Generar mensaje WhatsApp', onSelect: () => setWhatsappDespachoId(d.id) }] : []),
                          { label: 'Eliminar despacho', onSelect: () => setDeleteConfirmId(d.id), destructive: true },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListTableShell>
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Eliminar despacho"
        description="¿Eliminar este despacho? Las sacas quedarán sin asignar."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deleteMutation.mutateAsync(deleteConfirmId);
            toast.success('Despacho eliminado');
          } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) ?? 'Error al eliminar el despacho');
            throw error;
          }
        }}
      />

      <Dialog open={whatsappDespachoId != null} onOpenChange={(open) => !open && setWhatsappDespachoId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mensaje WhatsApp</DialogTitle>
          </DialogHeader>
          {loadingMensaje ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Generando mensaje...</p>
          ) : !mensajeGenerado?.mensaje?.trim() ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Configure la plantilla en Parámetros del sistema.
            </p>
          ) : (
            <>
              <div className="rounded-lg bg-[var(--color-muted)]/30 p-3 text-sm whitespace-pre-wrap">
                {mensajeGenerado.mensaje}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleCopyMensaje}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={estadoPorPeriodoOpen} onOpenChange={setEstadoPorPeriodoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Aplicar estado por periodo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Se aplicará el estado configurado en Parámetros sistema (Estados de rastreo por punto – &quot;Estado en
            tránsito&quot;) a todos los paquetes de los despachos cuya fecha esté en el periodo indicado.
          </p>
          <div className="grid gap-3 pt-2">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="periodo-desde">
                Fecha inicio
              </label>
              <Input
                id="periodo-desde"
                type="date"
                value={periodoFechaInicio}
                onChange={(e) => setPeriodoFechaInicio(e.target.value)}
                variant="clean"
                className="input-clean"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="periodo-hasta">
                Fecha fin
              </label>
              <Input
                id="periodo-hasta"
                type="date"
                value={periodoFechaFin}
                onChange={(e) => setPeriodoFechaFin(e.target.value)}
                variant="clean"
                className="input-clean"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse justify-end gap-2 pt-4 sm:flex-row">
            <Button variant="outline" onClick={() => setEstadoPorPeriodoOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAplicarEstadoPorPeriodo}
              disabled={aplicarEstadoPorPeriodo.isPending || !periodoFechaInicio || !periodoFechaFin}
            >
              {aplicarEstadoPorPeriodo.isPending ? 'Aplicando...' : 'Aplicar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
