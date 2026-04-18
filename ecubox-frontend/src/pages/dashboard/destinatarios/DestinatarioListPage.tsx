import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  Check,
  Copy,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useDestinatarios, useDeleteDestinatario } from '@/hooks/useDestinatarios';
import {
  useDestinatariosOperario,
  useDeleteDestinatarioOperario,
} from '@/hooks/useOperarioDespachos';
import { useAuthStore } from '@/stores/authStore';
import { DestinatarioForm } from './DestinatarioForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListTableShell } from '@/components/ListTableShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { DestinatarioFinal } from '@/types/destinatario';

export function DestinatarioListPage() {
  const hasDestinatariosOperario = useAuthStore((s) =>
    s.hasPermission('DESTINATARIOS_OPERARIO'),
  );
  const hasDestinatariosCreate = useAuthStore((s) => s.hasPermission('DESTINATARIOS_CREATE'));
  const hasDestinatariosUpdate = useAuthStore((s) => s.hasPermission('DESTINATARIOS_UPDATE'));
  const hasDestinatariosDelete = useAuthStore((s) => s.hasPermission('DESTINATARIOS_DELETE'));
  const [search, setSearch] = useState('');
  const { data: misData, isLoading: misLoading, error: misError } = useDestinatarios(
    !hasDestinatariosOperario,
  );
  const { data: opData, isLoading: opLoading, error: opError } = useDestinatariosOperario(
    search.trim() || undefined,
    hasDestinatariosOperario,
  );
  const destinatarios = hasDestinatariosOperario ? opData : misData;
  const isLoading = hasDestinatariosOperario ? opLoading : misLoading;
  const error = hasDestinatariosOperario ? opError : misError;
  const deleteDestinatario = useDeleteDestinatario();
  const deleteDestinatarioOperario = useDeleteDestinatarioOperario();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const list = useMemo(() => {
    const raw = destinatarios ?? [];
    if (hasDestinatariosOperario) return raw;
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (d) =>
        d.nombre?.toLowerCase().includes(q) ||
        (d.codigo?.toLowerCase().includes(q) ?? false) ||
        (d.telefono?.toLowerCase().includes(q) ?? false) ||
        (d.direccion?.toLowerCase().includes(q) ?? false) ||
        (d.provincia?.toLowerCase().includes(q) ?? false) ||
        (d.canton?.toLowerCase().includes(q) ?? false),
    );
  }, [destinatarios, search, hasDestinatariosOperario]);

  if (isLoading) {
    return <LoadingState text="Cargando destinatarios..." />;
  }
  if (error) {
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar destinatarios.
      </div>
    );
  }

  const allDestinatarios = destinatarios ?? [];
  const showClienteColumn = hasDestinatariosOperario;
  const canEdit = hasDestinatariosOperario || hasDestinatariosUpdate;

  return (
    <div className="page-stack">
      <ListToolbar
        title={hasDestinatariosOperario ? 'Destinatarios' : 'Mis destinatarios'}
        searchPlaceholder="Buscar por nombre, código, teléfono, dirección..."
        onSearchChange={setSearch}
        actions={
          hasDestinatariosCreate ? (
            <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo destinatario
            </Button>
          ) : undefined
        }
      />

      {list.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {list.length} destinatario{list.length === 1 ? '' : 's'}
          {list.length !== allDestinatarios.length
            ? ` de ${allDestinatarios.length}`
            : ''}
        </p>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={allDestinatarios.length === 0 ? 'No hay destinatarios' : 'Sin resultados'}
          description={
            allDestinatarios.length === 0
              ? 'Registra un destinatario para poder enviar paquetes a esa dirección.'
              : 'No se encontraron destinatarios con ese criterio.'
          }
          action={
            allDestinatarios.length === 0 && hasDestinatariosCreate ? (
              <Button onClick={() => setCreateOpen(true)}>Registrar destinatario</Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table className={showClienteColumn ? 'min-w-[900px]' : 'min-w-[720px]'}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Destinatario</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="min-w-[16rem]">Ubicación</TableHead>
                {showClienteColumn && <TableHead>Cliente</TableHead>}
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="max-w-[18rem] align-top">
                    <NombreCodigoCell destinatario={d} />
                  </TableCell>
                  <TableCell className="align-top">
                    <ContactoCell telefono={d.telefono} />
                  </TableCell>
                  <TableCell className="max-w-[20rem] align-top">
                    <UbicacionCell
                      direccion={d.direccion}
                      provincia={d.provincia}
                      canton={d.canton}
                    />
                  </TableCell>
                  {showClienteColumn && (
                    <TableCell className="align-top">
                      <ClienteCell nombre={d.clienteUsuarioNombre} />
                    </TableCell>
                  )}
                  <TableCell className="text-right align-top">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Editar destinatario"
                          title="Editar destinatario"
                          onClick={() => setEditingId(d.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {hasDestinatariosDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar destinatario"
                          title="Eliminar destinatario"
                          className="text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
                          onClick={() => setDeleteConfirmId(d.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListTableShell>
      )}

      {createOpen && (
        <DestinatarioForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
      {editingId != null && (
        <DestinatarioForm
          id={editingId}
          useOperarioApi={hasDestinatariosOperario}
          onClose={() => setEditingId(null)}
          onSuccess={() => setEditingId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="¿Eliminar destinatario?"
        description="Esta acción no se puede deshacer. Se eliminará el destinatario junto con todos sus paquetes asociados."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteDestinatario.isPending || deleteDestinatarioOperario.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            if (hasDestinatariosOperario) {
              await deleteDestinatarioOperario.mutateAsync(deleteConfirmId);
            } else {
              await deleteDestinatario.mutateAsync(deleteConfirmId);
            }
            toast.success('Destinatario eliminado');
          } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) ?? 'Error al eliminar el destinatario');
            throw error;
          }
        }}
      />
    </div>
  );
}

function NombreCodigoCell({ destinatario }: { destinatario: DestinatarioFinal }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-muted-foreground">
        <UserRound className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-foreground"
          title={destinatario.nombre}
        >
          {destinatario.nombre}
        </p>
        {destinatario.codigo ? (
          <CodigoCopyBadge codigo={destinatario.codigo} />
        ) : (
          <span className="text-[11px] italic text-muted-foreground">Sin código</span>
        )}
      </div>
    </div>
  );
}

function CodigoCopyBadge({ codigo }: { codigo: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(codigo);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar el código');
    }
  }

  return (
    <span className="mt-0.5 inline-flex items-center gap-1">
      <Badge
        variant="outline"
        className="h-5 rounded font-mono text-[11px] font-normal"
      >
        {codigo}
      </Badge>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Código copiado' : 'Copiar código'}
        title={copied ? '¡Copiado!' : 'Copiar código'}
        className="rounded p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-[var(--color-muted)] hover:text-foreground hover:opacity-100"
      >
        {copied ? (
          <Check className="h-3 w-3 text-[var(--color-success)]" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </span>
  );
}

function ContactoCell({ telefono }: { telefono?: string | null }) {
  const t = telefono?.trim();
  if (!t) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <a
      href={`tel:${t}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:underline"
      title={`Llamar a ${t}`}
    >
      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{t}</span>
    </a>
  );
}

function UbicacionCell({
  direccion,
  provincia,
  canton,
}: {
  direccion?: string | null;
  provincia?: string | null;
  canton?: string | null;
}) {
  const d = direccion?.trim();
  const ubicacion = [canton, provincia]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v))
    .join(', ');

  if (!d && !ubicacion) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-0.5">
        {d && (
          <p
            className="line-clamp-2 text-sm break-words text-foreground"
            title={d}
          >
            {d}
          </p>
        )}
        {ubicacion && (
          <p className="text-xs text-muted-foreground" title={ubicacion}>
            {ubicacion}
          </p>
        )}
      </div>
    </div>
  );
}

function ClienteCell({ nombre }: { nombre?: string | null }) {
  if (!nombre) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm">
      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate" title={nombre}>
        {nombre}
      </span>
    </div>
  );
}
