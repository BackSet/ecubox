import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useRol, useUpdateRolPermisos } from '@/hooks/useRoles';
import { usePermisos } from '@/hooks/usePermisos';
import { useAuthStore } from '@/stores/authStore';
import { SectionTitle } from '@/components/SectionTitle';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface RolEditPermisosProps {
  rolId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const GROUP_LABELS: Record<string, string> = {
  DESTINATARIOS: 'Destinatarios',
  PAQUETES: 'Paquetes',
  USUARIOS: 'Usuarios',
  ROLES: 'Roles',
  PERMISOS: 'Permisos',
  AGENCIAS: 'Agencias',
  DISTRIBUIDORES: 'Distribuidores',
  MANIFIESTOS: 'Manifiestos',
  TARIFA: 'Tarifa calculadora',
  DESPACHOS: 'Despachos',
};

function getGroupKey(codigo: string): string {
  const idx = codigo.indexOf('_');
  return idx > 0 ? codigo.slice(0, idx) : codigo;
}

export function RolEditPermisos({ rolId, onClose, onSuccess }: RolEditPermisosProps) {
  const { data: rol } = useRol(rolId);
  const { data: allPermisos = [] } = usePermisos();
  const updatePermisos = useUpdateRolPermisos();
  const refreshAuth = useAuthStore((s) => s.refreshAuth);
  const userRoles = useAuthStore((s) => s.roles);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const permisosByGroup = useMemo(() => {
    const map = new Map<string, typeof allPermisos>();
    for (const p of allPermisos) {
      const key = getGroupKey(p.codigo);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    const order = ['USUARIOS', 'ROLES', 'PERMISOS', 'DESTINATARIOS', 'PAQUETES', 'AGENCIAS', 'DISTRIBUIDORES', 'MANIFIESTOS', 'DESPACHOS', 'TARIFA'];
    const sorted = new Map<string, typeof allPermisos>();
    for (const k of order) {
      if (map.has(k)) sorted.set(k, map.get(k)!);
    }
    map.forEach((val, k) => {
      if (!sorted.has(k)) sorted.set(k, val);
    });
    return sorted;
  }, [allPermisos]);

  useEffect(() => {
    if (rol?.permisos) {
      setSelectedIds(rol.permisos.map((p) => p.id));
    }
  }, [rol]);

  function toggle(permisoId: number) {
    setSelectedIds((prev) =>
      prev.includes(permisoId)
        ? prev.filter((id) => id !== permisoId)
        : [...prev, permisoId]
    );
  }

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
      onSuccess();
    } catch {
      // Error handled by mutation
    }
  }

  const isSubmitting = updatePermisos.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar permisos: {rol?.nombre ?? ''}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SectionTitle variant="form">Permisos asignados</SectionTitle>
          <div className="max-h-64 space-y-4 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3">
            {Array.from(permisosByGroup.entries()).map(([groupKey, permisos]) => (
              <div key={groupKey}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  {GROUP_LABELS[groupKey] ?? groupKey}
                </div>
                <div className="space-y-2">
                  {permisos.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-foreground)]"
                    >
                      <Checkbox
                        checked={selectedIds.includes(p.id)}
                        onCheckedChange={() => toggle(p.id)}
                      />
                      <span className="font-medium">{p.codigo}</span>
                      {p.descripcion && (
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          — {p.descripcion}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
