import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  Eye,
  Hash,
  Loader2,
  Lock,
  PencilLine,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRol, useUpdateRolPermisos } from '@/hooks/useRoles';
import { usePermisos } from '@/hooks/usePermisos';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { PermisoDTO } from '@/types/rol';

interface RolEditPermisosProps {
  rolId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const GROUP_LABELS: Record<string, string> = {
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

const GROUP_ORDER = [
  'USUARIOS',
  'ROLES',
  'PERMISOS',
  'DESTINATARIOS',
  'PAQUETES',
  'AGENCIAS',
  'DISTRIBUIDORES',
  'MANIFIESTOS',
  'DESPACHOS',
  'GUIAS',
  'ENVIOS',
  'TRACKING',
  'TARIFA',
  'REPORTES',
];

function getGroupKey(codigo: string): string {
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
      'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
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
    tone: 'border-[var(--color-border)] bg-[var(--color-muted)]/40 text-muted-foreground',
    icon: Hash,
  },
};

export function RolEditPermisos({ rolId, onClose, onSuccess }: RolEditPermisosProps) {
  const { data: rol } = useRol(rolId);
  const { data: allPermisos = [] } = usePermisos();
  const updatePermisos = useUpdateRolPermisos();
  const refreshAuth = useAuthStore((s) => s.refreshAuth);
  const userRoles = useAuthStore((s) => s.roles);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [originalIds, setOriginalIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const permisosByGroup = useMemo(() => {
    const map = new Map<string, PermisoDTO[]>();
    for (const p of allPermisos) {
      const key = getGroupKey(p.codigo);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    map.forEach((arr) => arr.sort((a, b) => a.codigo.localeCompare(b.codigo)));
    const sorted = new Map<string, PermisoDTO[]>();
    for (const k of GROUP_ORDER) {
      if (map.has(k)) sorted.set(k, map.get(k)!);
    }
    map.forEach((val, k) => {
      if (!sorted.has(k)) sorted.set(k, val);
    });
    return sorted;
  }, [allPermisos]);

  const filteredByGroup = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return permisosByGroup;
    const out = new Map<string, PermisoDTO[]>();
    permisosByGroup.forEach((items, key) => {
      const matched = items.filter(
        (p) =>
          p.codigo.toLowerCase().includes(q) ||
          (p.descripcion?.toLowerCase().includes(q) ?? false) ||
          (GROUP_LABELS[key]?.toLowerCase().includes(q) ?? false),
      );
      if (matched.length > 0) out.set(key, matched);
    });
    return out;
  }, [permisosByGroup, search]);

  useEffect(() => {
    if (rol?.permisos) {
      const ids = rol.permisos.map((p) => p.id);
      setSelectedIds(ids);
      setOriginalIds(ids);
    }
  }, [rol]);

  function toggle(permisoId: number) {
    setSelectedIds((prev) =>
      prev.includes(permisoId)
        ? prev.filter((id) => id !== permisoId)
        : [...prev, permisoId],
    );
  }

  function toggleGroup(key: string, items: PermisoDTO[]) {
    const ids = items.map((i) => i.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
      const set = new Set(prev);
      ids.forEach((id) => set.add(id));
      return Array.from(set);
    });
    void key;
  }

  function selectAll() {
    setSelectedIds(allPermisos.map((p) => p.id));
  }

  function clearAll() {
    setSelectedIds([]);
  }

  function resetToOriginal() {
    setSelectedIds(originalIds);
  }

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const totalPermisos = allPermisos.length;
  const totalSeleccionados = selectedIds.length;
  const pct = totalPermisos > 0 ? Math.round((totalSeleccionados / totalPermisos) * 100) : 0;

  const diff = useMemo(() => {
    const orig = new Set(originalIds);
    const sel = new Set(selectedIds);
    const added = selectedIds.filter((id) => !orig.has(id));
    const removed = originalIds.filter((id) => !sel.has(id));
    return { added: added.length, removed: removed.length, hasChanges: added.length + removed.length > 0 };
  }, [originalIds, selectedIds]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updatePermisos.mutateAsync({
        id: rolId,
        body: { permisoIds: selectedIds },
      });
      if (rol?.nombre && userRoles.includes(rol.nombre)) {
        await refreshAuth();
      }
      toast.success('Permisos actualizados');
      onSuccess();
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'No se pudo guardar los permisos');
    }
  }

  const isSubmitting = updatePermisos.isPending;
  const esAdmin = rol?.nombre?.toUpperCase().includes('ADMIN');
  const RolIcon = esAdmin ? Crown : ShieldCheck;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                esAdmin
                  ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
                  : 'bg-primary/10 text-primary',
              )}
            >
              <RolIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle>Editar permisos del rol</DialogTitle>
              <DialogDescription>
                Selecciona los módulos y operaciones que podrá realizar el rol.
              </DialogDescription>
              {rol && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="h-5 rounded font-mono text-[11px] font-normal"
                  >
                    {rol.nombre}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">ID #{rol.id}</span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resumen */}
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{totalSeleccionados}</span>
                <span className="text-muted-foreground">de {totalPermisos} permisos</span>
                <span className="text-xs text-muted-foreground">({pct}%)</span>
              </div>
              {diff.hasChanges && (
                <div className="flex items-center gap-2 text-xs">
                  {diff.added > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-1.5 py-0.5 font-medium text-[var(--color-success)]">
                      <Check className="h-3 w-3" />+{diff.added}
                    </span>
                  )}
                  {diff.removed > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-1.5 py-0.5 font-medium text-[var(--color-destructive)]">
                      <X className="h-3 w-3" />−{diff.removed}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={resetToOriginal}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Deshacer
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
              <div
                className={cn(
                  'h-full transition-all',
                  totalSeleccionados === 0
                    ? 'bg-[var(--color-warning)]'
                    : pct >= 75
                      ? 'bg-[var(--color-primary)]'
                      : 'bg-[var(--color-success)]',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Buscador y acciones */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, descripción o módulo..."
                className="pl-9 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center justify-center rounded p-1 text-muted-foreground transition-colors hover:bg-[var(--color-muted)] hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={selectAll}
                disabled={totalSeleccionados === totalPermisos}
              >
                <Check className="mr-1 h-3 w-3" />
                Todos
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={clearAll}
                disabled={totalSeleccionados === 0}
              >
                <X className="mr-1 h-3 w-3" />
                Ninguno
              </Button>
            </div>
          </div>

          {/* Lista de permisos */}
          <div className="max-h-[55vh] space-y-2 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/10 p-2">
            {filteredByGroup.size === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No hay permisos que coincidan con "{search}"
                </p>
              </div>
            ) : (
              Array.from(filteredByGroup.entries()).map(([groupKey, permisos]) => {
                const ids = permisos.map((p) => p.id);
                const totalEnGrupo = ids.length;
                const seleccionadosEnGrupo = ids.filter((id) => selectedIds.includes(id)).length;
                const allSelected = seleccionadosEnGrupo === totalEnGrupo && totalEnGrupo > 0;
                const partial = seleccionadosEnGrupo > 0 && !allSelected;
                const isCollapsed = collapsed.has(groupKey);
                return (
                  <section
                    key={groupKey}
                    className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-card)]"
                  >
                    <header className="flex items-center justify-between gap-2 bg-[var(--color-muted)]/20 px-3 py-2">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => toggleCollapsed(groupKey)}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-sm font-semibold text-foreground">
                          {GROUP_LABELS[groupKey] ?? groupKey}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-5 rounded px-1.5 text-[10px] font-medium',
                            allSelected
                              ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]'
                              : partial
                                ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                                : 'border-[var(--color-border)] text-muted-foreground',
                          )}
                        >
                          {seleccionadosEnGrupo}/{totalEnGrupo}
                        </Badge>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => toggleGroup(groupKey, permisos)}
                      >
                        {allSelected ? 'Deseleccionar' : 'Seleccionar todos'}
                      </Button>
                    </header>
                    {!isCollapsed && (
                      <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2">
                        {permisos.map((p) => {
                          const checked = selectedIds.includes(p.id);
                          const tipo = getTipoAccion(p.codigo);
                          const meta = TIPO_META[tipo];
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggle(p.id)}
                              className={cn(
                                'group flex items-start gap-2 rounded-md border px-2 py-1.5 text-left transition-colors',
                                checked
                                  ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5'
                                  : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-muted)]/30',
                              )}
                            >
                              <span
                                className={cn(
                                  'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                                  checked
                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                                    : 'border-[var(--color-border)] bg-transparent',
                                )}
                              >
                                {checked && <Check className="h-3 w-3" />}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <code
                                    className={cn(
                                      'truncate font-mono text-[11px] font-medium',
                                      checked ? 'text-foreground' : 'text-foreground/80',
                                    )}
                                  >
                                    {p.codigo}
                                  </code>
                                  <span
                                    className={cn(
                                      'inline-flex shrink-0 items-center gap-0.5 rounded border px-1 text-[9px] font-medium',
                                      meta.tone,
                                    )}
                                    title={meta.label}
                                  >
                                    <meta.icon className="h-2.5 w-2.5" />
                                  </span>
                                </div>
                                {p.descripcion && (
                                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                                    {p.descripcion}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !diff.hasChanges}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
