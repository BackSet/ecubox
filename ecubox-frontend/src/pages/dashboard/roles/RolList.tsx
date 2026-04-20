import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Crown,
  Eye,
  Filter,
  Layers,
  Lock,
  PieChart,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useRolesPaginados } from '@/hooks/useRoles';
import { useSearchPagination } from '@/hooks/useSearchPagination';
import { usePermisos } from '@/hooks/usePermisos';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useAuthStore } from '@/stores/authStore';
import { RolEditPermisos } from './RolEditPermisos';
import { ListToolbar } from '@/components/ListToolbar';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { FiltrosBarSkeleton } from '@/components/skeletons/FiltrosBarSkeleton';
import { KpiCard } from '@/components/KpiCard';
import { ChipFiltro } from '@/components/ChipFiltro';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { RolDTO } from '@/types/rol';

const ESTADO_TODOS = '__todos__';

type EstadoFiltro = typeof ESTADO_TODOS | 'con-permisos' | 'sin-permisos';

function getModulo(codigo: string): string {
  const idx = codigo.indexOf('_');
  return idx > 0 ? codigo.slice(0, idx) : codigo;
}

const MODULO_LABELS: Record<string, string> = {
  USUARIOS: 'Usuarios',
  ROLES: 'Roles',
  PERMISOS: 'Permisos',
  CONSIGNATARIOS: 'Consignatarios',
  PAQUETES: 'Paquetes',
  AGENCIAS: 'Agencias',
  COURIERS_ENTREGA: 'Couriers de entrega',
  MANIFIESTOS: 'Manifiestos',
  DESPACHOS: 'Despachos',
  TARIFA: 'Tarifa',
  GUIAS: 'Guías',
  ENVIOS: 'Envíos',
  TRACKING: 'Tracking',
  REPORTES: 'Reportes',
};

export function RolList() {
  const { q, setQ, page, size, setPage, setSize, resetPage } =
    useSearchPagination({ initialSize: 25 });
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useRolesPaginados({ q: q.trim() || undefined, page, size });
  const { data: permisosTotal = [] } = usePermisos();
  const { data: usuarios = [] } = useUsuarios();
  const hasWrite = useAuthStore((s) => s.hasPermission('ROLES_WRITE'));
  const [editingRolId, setEditingRolId] = useState<number | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>(ESTADO_TODOS);

  const allRoles = useMemo<RolDTO[]>(() => data?.content ?? [], [data]);
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const usuariosPorRol = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of usuarios) {
      for (const r of u.roles ?? []) {
        map.set(r, (map.get(r) ?? 0) + 1);
      }
    }
    return map;
  }, [usuarios]);

  const stats = useMemo(() => {
    const total = totalElements;
    const totalPermisosSistema = permisosTotal.length;
    const conPermisos = allRoles.filter((r) => (r.permisos?.length ?? 0) > 0).length;
    const sumPermisos = allRoles.reduce((acc, r) => acc + (r.permisos?.length ?? 0), 0);
    const promedio =
      allRoles.length > 0 ? Math.round((sumPermisos / allRoles.length) * 10) / 10 : 0;
    return {
      total,
      totalPermisosSistema,
      conPermisos,
      sinPermisos: allRoles.length - conPermisos,
      promedio,
    };
  }, [allRoles, permisosTotal, totalElements]);

  const list = useMemo(() => {
    let raw = allRoles;
    if (estadoFiltro === 'con-permisos') {
      raw = raw.filter((r) => (r.permisos?.length ?? 0) > 0);
    } else if (estadoFiltro === 'sin-permisos') {
      raw = raw.filter((r) => (r.permisos?.length ?? 0) === 0);
    }
    return raw;
  }, [allRoles, estadoFiltro]);

  const filtersActive = Boolean(q.trim()) || estadoFiltro !== ESTADO_TODOS;

  function clearFilters() {
    setQ('');
    setEstadoFiltro(ESTADO_TODOS);
    resetPage();
  }

  if (error && !data) {
    return (
      <InlineErrorBanner
        message="Error al cargar roles"
        hint="Verifica tu conexión o intenta de nuevo."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  return (
    <div className="page-stack">
      <ListToolbar
        title="Roles"
        searchPlaceholder="Buscar por nombre del rol, código o descripción de permiso..."
        value={q}
        onSearchChange={setQ}
      />

      {error && (
        <InlineErrorBanner
          message="No se pudieron actualizar los roles"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}

      {isLoading ? (
        <KpiCardsGridSkeleton count={4} gridClassName="grid grid-cols-2 gap-3 lg:grid-cols-4" withHint />
      ) : (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Total roles"
          value={stats.total}
          tone="primary"
        />
        <KpiCard
          icon={<Lock className="h-5 w-5" />}
          label="Permisos del sistema"
          value={stats.totalPermisosSistema}
          tone="neutral"
          hint="Total disponibles para asignar"
        />
        <KpiCard
          icon={<PieChart className="h-5 w-5" />}
          label="Promedio por rol"
          value={stats.promedio}
          tone="success"
          hint={`${stats.conPermisos} con permisos / ${stats.sinPermisos} vacíos`}
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Roles sin permisos"
          value={stats.sinPermisos}
          tone={stats.sinPermisos > 0 ? 'warning' : 'neutral'}
          hint={stats.sinPermisos > 0 ? 'No otorgan acceso a nada' : 'Todos los roles configurados'}
        />
      </div>
      )}

      {isLoading ? (
        <FiltrosBarSkeleton chips={3} filters={0} />
      ) : (
      <div className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </div>
          <div className="flex flex-wrap gap-2">
            <ChipFiltro
              label="Todos"
              count={stats.total}
              active={estadoFiltro === ESTADO_TODOS}
              onClick={() => {
                setEstadoFiltro(ESTADO_TODOS);
                resetPage();
              }}
            />
            <ChipFiltro
              label="Con permisos"
              count={stats.conPermisos}
              active={estadoFiltro === 'con-permisos'}
              tone="success"
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              onClick={() => {
                setEstadoFiltro(
                  estadoFiltro === 'con-permisos' ? ESTADO_TODOS : 'con-permisos',
                );
                resetPage();
              }}
            />
            <ChipFiltro
              label="Vacíos"
              count={stats.sinPermisos}
              active={estadoFiltro === 'sin-permisos'}
              tone="warning"
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              onClick={() => {
                setEstadoFiltro(
                  estadoFiltro === 'sin-permisos' ? ESTADO_TODOS : 'sin-permisos',
                );
                resetPage();
              }}
              hideWhenZero
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{list.length}</span> de{' '}
            {totalElements}
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
      </div>
      )}

      {isLoading ? (
        <ListTableShell>
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[16rem]">Rol</TableHead>
                <TableHead className="w-[8rem]">Usuarios</TableHead>
                <TableHead className="w-[10rem]">Permisos</TableHead>
                <TableHead className="hidden md:table-cell">Módulos cubiertos</TableHead>
                {hasWrite && <TableHead className="w-12 text-right" aria-label="Acciones" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton
                columns={hasWrite ? 5 : 4}
                columnClasses={{ 3: 'hidden md:table-cell' }}
              />
            </TableBody>
          </Table>
        </ListTableShell>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={totalElements === 0 ? 'No hay roles' : 'Sin resultados'}
          description={
            totalElements === 0
              ? 'Los roles se gestionan desde el backend.'
              : 'No se encontraron roles con esos filtros.'
          }
          action={
            filtersActive ? (
              <Button variant="outline" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[16rem]">Rol</TableHead>
                <TableHead className="w-[8rem]">Usuarios</TableHead>
                <TableHead className="w-[10rem]">Permisos</TableHead>
                <TableHead className="hidden md:table-cell">Módulos cubiertos</TableHead>
                {hasWrite && <TableHead className="w-12 text-right" aria-label="Acciones" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => {
                const usuariosCount = usuariosPorRol.get(r.nombre) ?? 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="align-top">
                      <RolCell rol={r} />
                    </TableCell>
                    <TableCell className="align-top">
                      <UsuariosCell count={usuariosCount} />
                    </TableCell>
                    <TableCell className="align-top">
                      <PermisosCountCell
                        asignados={r.permisos?.length ?? 0}
                        total={stats.totalPermisosSistema}
                      />
                    </TableCell>
                    <TableCell className="hidden align-top md:table-cell">
                      <ModulosCell rol={r} />
                    </TableCell>
                    {hasWrite && (
                      <TableCell className="align-top text-right">
                        <RowActionsMenu
                          items={[
                            {
                              label: 'Editar permisos',
                              icon: Settings2,
                              onSelect: () => setEditingRolId(r.id),
                            },
                          ]}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ListTableShell>
      )}

      {totalElements > 0 && (
        <TablePagination
          page={page}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={setSize}
          loading={isFetching}
        />
      )}

      {editingRolId != null && (
        <RolEditPermisos
          rolId={editingRolId}
          onClose={() => setEditingRolId(null)}
          onSuccess={() => setEditingRolId(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Componentes auxiliares
// ============================================================================

function RolCell({ rol }: { rol: RolDTO }) {
  const upperName = rol.nombre?.toUpperCase() ?? '';
  const esAdmin = upperName.includes('ADMIN');
  const Icon = esAdmin ? Crown : ShieldCheck;
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
          esAdmin
            ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
            : 'bg-[var(--color-muted)] text-[var(--color-primary)]',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{rol.nombre || '—'}</p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          ID #{rol.id}
        </p>
      </div>
    </div>
  );
}

function UsuariosCell({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs italic text-muted-foreground">
        <Users className="h-3 w-3" />
        Sin usuarios
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-2 py-0.5 text-xs font-medium text-foreground">
      <Users className="h-3 w-3 text-muted-foreground" />
      {count} {count === 1 ? 'usuario' : 'usuarios'}
    </span>
  );
}

function PermisosCountCell({ asignados, total }: { asignados: number; total: number }) {
  const pct = total > 0 ? Math.round((asignados / total) * 100) : 0;
  const tone =
    asignados === 0
      ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
      : pct >= 75
        ? 'border-[var(--color-primary)]/30 bg-[var(--color-muted)] text-[var(--color-primary)]'
        : 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]';
  return (
    <div className="space-y-1">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
          tone,
        )}
      >
        <Lock className="h-3 w-3" />
        {asignados} / {total}
      </span>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
        <div
          className={cn(
            'h-full transition-all',
            asignados === 0
              ? 'bg-[var(--color-warning)]'
              : pct >= 75
                ? 'bg-[var(--color-primary)]'
                : 'bg-[var(--color-success)]',
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function ModulosCell({ rol }: { rol: RolDTO }) {
  const modulosCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of rol.permisos ?? []) {
      const m = getModulo(p.codigo);
      map.set(m, (map.get(m) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [rol.permisos]);

  if (modulosCount.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs italic text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        Sin acceso a ningún módulo
      </span>
    );
  }
  const visible = modulosCount.slice(0, 5);
  const extra = modulosCount.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map(([m, c]) => (
        <Badge
          key={m}
          variant="outline"
          className="h-5 rounded border-[var(--color-border)] bg-[var(--color-muted)]/30 px-1.5 text-[11px] font-medium text-foreground"
          title={`${c} permiso${c === 1 ? '' : 's'} en ${MODULO_LABELS[m] ?? m}`}
        >
          <Layers className="mr-1 h-2.5 w-2.5 text-muted-foreground" />
          {MODULO_LABELS[m] ?? m}
          <span className="ml-1 text-muted-foreground">·{c}</span>
        </Badge>
      ))}
      {extra > 0 && (
        <Badge
          variant="outline"
          className="h-5 rounded px-1.5 text-[11px] font-medium text-muted-foreground"
          title={modulosCount
            .slice(5)
            .map(([m]) => MODULO_LABELS[m] ?? m)
            .join(', ')}
        >
          <Eye className="mr-1 h-2.5 w-2.5" />
          +{extra} más
        </Badge>
      )}
    </div>
  );
}
