import { useMemo, useState } from 'react';
import {
  BookOpen,
  Boxes,
  Eye,
  Filter,
  Hash,
  Key,
  Layers,
  LayoutGrid,
  List,
  Lock,
  PencilLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { usePermisos } from '@/hooks/usePermisos';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { KpiCard } from '@/components/KpiCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { PermisoDTO } from '@/types/rol';

const MODULO_TODOS = '__todos__';
const TIPO_TODOS = '__todos__';

const MODULO_LABELS: Record<string, string> = {
  USUARIOS: 'Usuarios',
  ROLES: 'Roles',
  PERMISOS: 'Permisos',
  DESTINATARIOS: 'Destinatarios',
  PAQUETES: 'Paquetes',
  AGENCIAS: 'Agencias',
  DISTRIBUIDORES: 'Distribuidores',
  MANIFIESTOS: 'Manifiestos',
  DESPACHOS: 'Despachos',
  TARIFA: 'Tarifa',
  GUIAS: 'Guías master',
  ENVIOS: 'Envíos consolidados',
  TRACKING: 'Tracking',
  REPORTES: 'Reportes',
};

const MODULO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  USUARIOS: Users,
  ROLES: ShieldCheck,
  PERMISOS: Lock,
  DESTINATARIOS: Users,
  PAQUETES: Boxes,
  AGENCIAS: Layers,
  DISTRIBUIDORES: Layers,
  MANIFIESTOS: BookOpen,
  DESPACHOS: BookOpen,
  TARIFA: Sparkles,
};

function getModulo(codigo: string): string {
  const idx = codigo.indexOf('_');
  return idx > 0 ? codigo.slice(0, idx) : codigo;
}

function getAccion(codigo: string): string {
  const idx = codigo.indexOf('_');
  return idx > 0 ? codigo.slice(idx + 1) : '';
}

type TipoAccion = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'WRITE' | 'OTRO';

function getTipoAccion(codigo: string): TipoAccion {
  const accion = getAccion(codigo).toUpperCase();
  if (!accion) return 'OTRO';
  if (accion.includes('READ') || accion.includes('VIEW') || accion.includes('LIST')) return 'READ';
  if (accion.includes('CREATE') || accion.includes('ADD') || accion.includes('NEW')) return 'CREATE';
  if (accion.includes('UPDATE') || accion.includes('EDIT')) return 'UPDATE';
  if (accion.includes('DELETE') || accion.includes('REMOVE')) return 'DELETE';
  if (accion.includes('WRITE')) return 'WRITE';
  return 'OTRO';
}

const TIPO_META: Record<
  TipoAccion,
  { label: string; tone: string; icon: React.ComponentType<{ className?: string }> }
> = {
  READ: {
    label: 'Lectura',
    tone:
      'border-[var(--color-primary)]/30 bg-[var(--color-muted)] text-[var(--color-primary)]',
    icon: Eye,
  },
  CREATE: {
    label: 'Crear',
    tone:
      'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]',
    icon: Sparkles,
  },
  UPDATE: {
    label: 'Editar',
    tone:
      'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
    icon: PencilLine,
  },
  DELETE: {
    label: 'Eliminar',
    tone:
      'border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]',
    icon: Trash2,
  },
  WRITE: {
    label: 'Escritura',
    tone:
      'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
    icon: PencilLine,
  },
  OTRO: {
    label: 'Otros',
    tone:
      'border-[var(--color-border)] bg-[var(--color-muted)]/40 text-muted-foreground',
    icon: Hash,
  },
};

type Vista = 'tabla' | 'modulos';

export function PermisoList() {
  const { data: permisos, isLoading, error } = usePermisos();
  const [search, setSearch] = useState('');
  const [moduloFiltro, setModuloFiltro] = useState<string>(MODULO_TODOS);
  const [tipoFiltro, setTipoFiltro] = useState<string>(TIPO_TODOS);
  const [vista, setVista] = useState<Vista>('tabla');

  const allPermisos = useMemo(() => permisos ?? [], [permisos]);

  const stats = useMemo(() => {
    const total = allPermisos.length;
    const modulos = new Set<string>();
    let lectura = 0;
    let escritura = 0;
    for (const p of allPermisos) {
      modulos.add(getModulo(p.codigo));
      const t = getTipoAccion(p.codigo);
      if (t === 'READ') lectura++;
      else if (t === 'CREATE' || t === 'UPDATE' || t === 'DELETE' || t === 'WRITE') escritura++;
    }
    return { total, modulos: modulos.size, lectura, escritura };
  }, [allPermisos]);

  const modulosOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of allPermisos) set.add(getModulo(p.codigo));
    return Array.from(set).sort();
  }, [allPermisos]);

  const tiposOptions: TipoAccion[] = useMemo(() => {
    const set = new Set<TipoAccion>();
    for (const p of allPermisos) set.add(getTipoAccion(p.codigo));
    const order: TipoAccion[] = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'WRITE', 'OTRO'];
    return order.filter((t) => set.has(t));
  }, [allPermisos]);

  const list = useMemo(() => {
    let raw = allPermisos;
    const q = search.trim().toLowerCase();
    if (q) {
      raw = raw.filter(
        (p) =>
          p.codigo?.toLowerCase().includes(q) ||
          (p.descripcion?.toLowerCase().includes(q) ?? false),
      );
    }
    if (moduloFiltro !== MODULO_TODOS) {
      raw = raw.filter((p) => getModulo(p.codigo) === moduloFiltro);
    }
    if (tipoFiltro !== TIPO_TODOS) {
      raw = raw.filter((p) => getTipoAccion(p.codigo) === tipoFiltro);
    }
    return raw;
  }, [allPermisos, search, moduloFiltro, tipoFiltro]);

  const grupos = useMemo(() => {
    const map = new Map<string, PermisoDTO[]>();
    for (const p of list) {
      const m = getModulo(p.codigo);
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [list]);

  const filtersActive =
    Boolean(search.trim()) || moduloFiltro !== MODULO_TODOS || tipoFiltro !== TIPO_TODOS;

  function clearFilters() {
    setSearch('');
    setModuloFiltro(MODULO_TODOS);
    setTipoFiltro(TIPO_TODOS);
  }

  if (isLoading) {
    return <LoadingState text="Cargando permisos..." />;
  }
  if (error) {
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar permisos.
      </div>
    );
  }

  return (
    <div className="page-stack">
      <ListToolbar
        title="Permisos"
        searchPlaceholder="Buscar por código o descripción..."
        onSearchChange={setSearch}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={<Key className="h-5 w-5" />}
          label="Total permisos"
          value={stats.total}
          tone="primary"
        />
        <KpiCard
          icon={<Layers className="h-5 w-5" />}
          label="Módulos cubiertos"
          value={stats.modulos}
          tone="neutral"
          hint="Áreas funcionales del sistema"
        />
        <KpiCard
          icon={<Eye className="h-5 w-5" />}
          label="Permisos de lectura"
          value={stats.lectura}
          tone="success"
        />
        <KpiCard
          icon={<PencilLine className="h-5 w-5" />}
          label="Permisos de escritura"
          value={stats.escritura}
          tone="warning"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </div>
          <Select value={moduloFiltro} onValueChange={setModuloFiltro}>
            <SelectTrigger className="h-9 w-full sm:w-[200px]">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MODULO_TODOS}>Todos los módulos</SelectItem>
              {modulosOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {MODULO_LABELS[m] ?? m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <SelectValue placeholder="Tipo de acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TIPO_TODOS}>Todos los tipos</SelectItem>
              {tiposOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_META[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-0.5">
            <button
              type="button"
              onClick={() => setVista('tabla')}
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium transition-colors',
                vista === 'tabla'
                  ? 'bg-[var(--color-muted)] text-[var(--color-primary)]'
                  : 'text-muted-foreground hover:bg-[var(--color-muted)]/40',
              )}
              title="Vista en tabla"
            >
              <List className="h-3.5 w-3.5" />
              Tabla
            </button>
            <button
              type="button"
              onClick={() => setVista('modulos')}
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium transition-colors',
                vista === 'modulos'
                  ? 'bg-[var(--color-muted)] text-[var(--color-primary)]'
                  : 'text-muted-foreground hover:bg-[var(--color-muted)]/40',
              )}
              title="Vista por módulos"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Módulos
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{list.length}</span> de{' '}
            {allPermisos.length}
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

      {list.length === 0 ? (
        <EmptyState
          icon={Key}
          title={allPermisos.length === 0 ? 'No hay permisos' : 'Sin resultados'}
          description={
            allPermisos.length === 0
              ? 'Los permisos se gestionan desde el backend.'
              : 'No se encontraron permisos con esos filtros.'
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
      ) : vista === 'tabla' ? (
        <ListTableShell>
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[12rem]">Módulo</TableHead>
                <TableHead className="w-[18rem]">Código</TableHead>
                <TableHead className="w-[8rem]">Tipo</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => {
                const modulo = getModulo(p.codigo);
                const tipo = getTipoAccion(p.codigo);
                const meta = TIPO_META[tipo];
                const ModuloIcon = MODULO_ICONS[modulo] ?? Hash;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <ModuloIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {MODULO_LABELS[modulo] ?? modulo}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-[var(--color-muted)]/40 px-1.5 py-0.5 font-mono text-xs text-foreground">
                        {p.codigo}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                          meta.tone,
                        )}
                      >
                        <meta.icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      {p.descripcion ?? <span className="italic text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ListTableShell>
      ) : (
        <div className="space-y-3">
          {grupos.map(([modulo, items]) => {
            const ModuloIcon = MODULO_ICONS[modulo] ?? Hash;
            return (
              <section
                key={modulo}
                className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-card)]"
              >
                <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <ModuloIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {MODULO_LABELS[modulo] ?? modulo}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {items.length} permiso{items.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="h-5 rounded font-mono text-[10px] font-normal"
                  >
                    {modulo}
                  </Badge>
                </header>
                <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
                  {items.map((p) => {
                    const tipo = getTipoAccion(p.codigo);
                    const meta = TIPO_META[tipo];
                    return (
                      <div
                        key={p.id}
                        className="flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-muted)]/20"
                      >
                        <span
                          className={cn(
                            'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border',
                            meta.tone,
                          )}
                          title={meta.label}
                        >
                          <meta.icon className="h-3 w-3" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <code className="block truncate font-mono text-xs font-semibold text-foreground">
                            {p.codigo}
                          </code>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {p.descripcion ?? meta.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
