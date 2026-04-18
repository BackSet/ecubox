import { useMemo, useState } from 'react';
import {
  AtSign,
  CheckCircle2,
  Filter,
  Mail,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Shield,
  ShieldCheck,
  Trash2,
  UserCircle2,
  UserCog,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUsuarios, useDeleteUsuario, useUpdateUsuario } from '@/hooks/useUsuarios';
import { useRoles } from '@/hooks/useRoles';
import { useAuthStore } from '@/stores/authStore';
import { UsuarioForm } from './UsuarioForm';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KpiCard } from '@/components/KpiCard';
import { SurfaceCard } from '@/components/ui/surface-card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { UsuarioDTO } from '@/types/usuario';

type EstadoFiltro = 'todos' | 'activos' | 'inactivos';
const ROL_TODOS = '__todos__';
const ROL_SIN_ROL = '__sin_rol__';

export function UsuarioList() {
  const { data: usuarios, isLoading, error } = useUsuarios();
  const { data: rolesCatalog = [] } = useRoles();
  const deleteUsuario = useDeleteUsuario();
  const updateUsuario = useUpdateUsuario();
  const hasWrite = useAuthStore((s) => s.hasPermission('USUARIOS_WRITE'));
  const currentUsername = useAuthStore((s) => s.username);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos');
  const [rolFiltro, setRolFiltro] = useState<string>(ROL_TODOS);

  const allUsuarios = useMemo(() => usuarios ?? [], [usuarios]);

  const list = useMemo(() => {
    let raw = allUsuarios;
    const q = search.trim().toLowerCase();
    if (q) {
      raw = raw.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          (u.email?.toLowerCase().includes(q) ?? false) ||
          (u.roles?.some((r) => r.toLowerCase().includes(q)) ?? false),
      );
    }
    if (estadoFiltro !== 'todos') {
      raw = raw.filter((u) => (estadoFiltro === 'activos' ? u.enabled : !u.enabled));
    }
    if (rolFiltro !== ROL_TODOS) {
      raw =
        rolFiltro === ROL_SIN_ROL
          ? raw.filter((u) => (u.roles?.length ?? 0) === 0)
          : raw.filter((u) => (u.roles ?? []).includes(rolFiltro));
    }
    return raw;
  }, [allUsuarios, search, estadoFiltro, rolFiltro]);

  const stats = useMemo(() => {
    const total = allUsuarios.length;
    const activos = allUsuarios.filter((u) => u.enabled).length;
    const inactivos = total - activos;
    const sinRol = allUsuarios.filter((u) => (u.roles?.length ?? 0) === 0).length;
    return { total, activos, inactivos, sinRol };
  }, [allUsuarios]);

  const rolesOptions = useMemo(() => {
    const fromUsers = new Set<string>();
    for (const u of allUsuarios) {
      for (const r of u.roles ?? []) fromUsers.add(r);
    }
    for (const r of rolesCatalog) fromUsers.add(r.nombre);
    return Array.from(fromUsers).sort((a, b) => a.localeCompare(b));
  }, [allUsuarios, rolesCatalog]);

  const filtersActive =
    Boolean(search.trim()) || estadoFiltro !== 'todos' || rolFiltro !== ROL_TODOS;

  function clearFilters() {
    setSearch('');
    setEstadoFiltro('todos');
    setRolFiltro(ROL_TODOS);
  }

  async function handleToggleEnabled(u: UsuarioDTO) {
    try {
      await updateUsuario.mutateAsync({
        id: u.id,
        body: { enabled: !u.enabled },
      });
      toast.success(u.enabled ? 'Usuario desactivado' : 'Usuario activado');
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'No se pudo actualizar el usuario');
    }
  }

  if (isLoading) {
    return <LoadingState text="Cargando usuarios..." />;
  }
  if (error) {
    return <div className="ui-alert ui-alert-error">Error al cargar usuarios.</div>;
  }

  return (
    <div className="page-stack">
      <ListToolbar
        title="Usuarios"
        searchPlaceholder="Buscar por usuario, email o rol..."
        onSearchChange={setSearch}
        actions={
          hasWrite ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo usuario
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Total usuarios"
          value={stats.total}
          tone="primary"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Activos"
          value={stats.activos}
          tone="success"
          hint={stats.total ? `${Math.round((stats.activos / stats.total) * 100)}% del total` : undefined}
        />
        <KpiCard
          icon={<UserMinus className="h-5 w-5" />}
          label="Inactivos"
          value={stats.inactivos}
          tone={stats.inactivos > 0 ? 'warning' : 'neutral'}
        />
        <KpiCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Sin rol asignado"
          value={stats.sinRol}
          tone={stats.sinRol > 0 ? 'danger' : 'neutral'}
          hint={stats.sinRol > 0 ? 'Requieren asignación de roles' : 'Todos tienen al menos un rol'}
        />
      </div>

      <SurfaceCard className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </div>
          <div className="flex flex-wrap gap-2">
            <SegBtn
              active={estadoFiltro === 'todos'}
              onClick={() => setEstadoFiltro('todos')}
            >
              Todos
            </SegBtn>
            <SegBtn
              active={estadoFiltro === 'activos'}
              onClick={() => setEstadoFiltro('activos')}
              tone="success"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Activos
            </SegBtn>
            <SegBtn
              active={estadoFiltro === 'inactivos'}
              onClick={() => setEstadoFiltro('inactivos')}
              tone="warning"
            >
              <PowerOff className="h-3.5 w-3.5" />
              Inactivos
            </SegBtn>
          </div>
          <Select value={rolFiltro} onValueChange={setRolFiltro}>
            <SelectTrigger className="h-9 w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROL_TODOS}>Todos los roles</SelectItem>
              <SelectItem value={ROL_SIN_ROL}>Sin rol asignado</SelectItem>
              {rolesOptions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{list.length}</span> de{' '}
            {allUsuarios.length}
          </span>
          {filtersActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={clearFilters}
            >
              <X className="mr-1 h-3 w-3" />
              Limpiar
            </Button>
          )}
        </div>
      </SurfaceCard>

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title={allUsuarios.length === 0 ? 'No hay usuarios' : 'Sin resultados'}
          description={
            allUsuarios.length === 0
              ? 'Crea el primer usuario para comenzar.'
              : 'No se encontraron usuarios con esos filtros.'
          }
          action={
            allUsuarios.length === 0 && hasWrite ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo usuario
              </Button>
            ) : filtersActive ? (
              <Button variant="outline" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Usuario</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="w-[8rem]">Estado</TableHead>
                <TableHead>Roles</TableHead>
                {hasWrite && <TableHead className="w-[12rem] text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => {
                const esActual =
                  currentUsername != null &&
                  u.username?.toLowerCase() === currentUsername.toLowerCase();
                return (
                  <TableRow key={u.id}>
                    <TableCell className="align-top">
                      <UsuarioCell usuario={u} esActual={esActual} />
                    </TableCell>
                    <TableCell className="align-top">
                      <ContactoCell email={u.email} />
                    </TableCell>
                    <TableCell className="align-top">
                      <EstadoCell enabled={u.enabled} />
                    </TableCell>
                    <TableCell className="align-top">
                      <RolesCell roles={u.roles ?? []} />
                    </TableCell>
                    {hasWrite && (
                      <TableCell className="align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={u.enabled ? 'Desactivar usuario' : 'Activar usuario'}
                            aria-label={u.enabled ? 'Desactivar usuario' : 'Activar usuario'}
                            disabled={esActual || updateUsuario.isPending}
                            onClick={() => handleToggleEnabled(u)}
                            className={
                              u.enabled
                                ? 'text-[var(--color-warning)] hover:text-[var(--color-warning)]'
                                : 'text-[var(--color-success)] hover:text-[var(--color-success)]'
                            }
                          >
                            {u.enabled ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Editar usuario"
                            aria-label="Editar usuario"
                            onClick={() => setEditingId(u.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={
                              esActual
                                ? 'No puedes eliminar tu propio usuario'
                                : 'Eliminar usuario'
                            }
                            aria-label="Eliminar usuario"
                            disabled={esActual}
                            className="text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
                            onClick={() => setDeleteConfirmId(u.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ListTableShell>
      )}

      {createOpen && (
        <UsuarioForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
      {editingId != null && (
        <UsuarioForm
          id={editingId}
          onClose={() => setEditingId(null)}
          onSuccess={() => setEditingId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Eliminar usuario"
        description="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteUsuario.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deleteUsuario.mutateAsync(deleteConfirmId);
            toast.success('Usuario eliminado');
          } catch (err: unknown) {
            toast.error(getApiErrorMessage(err) ?? 'Error al eliminar el usuario');
            throw err;
          }
        }}
      />
    </div>
  );
}

// ============================================================================
// Componentes auxiliares
// ============================================================================

interface SegBtnProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
}

function SegBtn({ active, onClick, children, tone = 'neutral' }: SegBtnProps) {
  const toneCls =
    tone === 'success'
      ? 'data-[active=true]:bg-[var(--color-success)]/15 data-[active=true]:text-[var(--color-success)] data-[active=true]:border-[var(--color-success)]/30'
      : tone === 'warning'
        ? 'data-[active=true]:bg-[var(--color-warning)]/15 data-[active=true]:text-[var(--color-warning)] data-[active=true]:border-[var(--color-warning)]/30'
        : 'data-[active=true]:bg-[var(--color-primary)]/10 data-[active=true]:text-[var(--color-primary)] data-[active=true]:border-[var(--color-primary)]/30';
  return (
    <button
      type="button"
      data-active={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-[var(--color-muted)]/40',
        toneCls,
      )}
    >
      {children}
    </button>
  );
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function UsuarioCell({ usuario, esActual }: { usuario: UsuarioDTO; esActual: boolean }) {
  const initials = getInitials(usuario.username);
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          usuario.enabled
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            : 'bg-[var(--color-muted)] text-muted-foreground',
        )}
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">
            {usuario.username || '—'}
          </p>
          {esActual && (
            <Badge
              variant="outline"
              className="h-5 rounded border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-1.5 text-[10px] font-medium text-[var(--color-primary)]"
            >
              Tú
            </Badge>
          )}
        </div>
        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <UserCircle2 className="h-3 w-3" />
          ID #{usuario.id}
        </p>
      </div>
    </div>
  );
}

function ContactoCell({ email }: { email?: string | null }) {
  if (!email) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <AtSign className="h-3 w-3" />
        Sin email
      </span>
    );
  }
  return (
    <a
      href={`mailto:${email}`}
      className="inline-flex items-center gap-1.5 text-xs text-foreground hover:text-[var(--color-primary)] hover:underline"
      title={`Enviar correo a ${email}`}
    >
      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="truncate">{email}</span>
    </a>
  );
}

function EstadoCell({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <StatusBadge tone="success">
      <CheckCircle2 className="h-3 w-3" />
      Activo
    </StatusBadge>
  ) : (
    <StatusBadge tone="neutral">
      <PowerOff className="h-3 w-3" />
      Inactivo
    </StatusBadge>
  );
}

function RolesCell({ roles }: { roles: string[] }) {
  if (!roles || roles.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs italic text-muted-foreground">
        <UserCog className="h-3 w-3" />
        Sin rol asignado
      </span>
    );
  }
  const visible = roles.slice(0, 3);
  const extra = roles.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((r) => (
        <Badge
          key={r}
          variant="outline"
          className="h-5 rounded border-[var(--color-border)] bg-[var(--color-muted)]/30 px-1.5 text-[11px] font-medium text-foreground"
          title={r}
        >
          <Shield className="mr-1 h-2.5 w-2.5" />
          {r}
        </Badge>
      ))}
      {extra > 0 && (
        <Badge
          variant="outline"
          className="h-5 rounded px-1.5 text-[11px] font-medium text-muted-foreground"
          title={roles.slice(3).join(', ')}
        >
          +{extra}
        </Badge>
      )}
    </div>
  );
}
