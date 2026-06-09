import { useMemo, useState } from 'react';
import { Boxes, Layers, Package, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { GestionarEstadosPaquetesTab } from './GestionarEstadosPaquetesPage';
import { GestionarEstadosGuiasTab } from './GestionarEstadosGuiasTab';
import { GestionarEstadosConsolidadosTab } from './GestionarEstadosConsolidadosTab';

type TabKey = 'paquetes' | 'guias' | 'consolidados';

interface TabDef {
  key: TabKey;
  label: string;
  icon: LucideIcon;
  /** Permiso de lectura mínimo para ver la pestaña. */
  permisos: string[];
}

const TABS: TabDef[] = [
  { key: 'paquetes', label: 'Paquetes', icon: Package, permisos: ['PAQUETES_PESO_WRITE'] },
  { key: 'guias', label: 'Guías master', icon: Boxes, permisos: ['GUIAS_MASTER_READ'] },
  { key: 'consolidados', label: 'Consolidados', icon: Layers, permisos: ['ENVIOS_CONSOLIDADOS_READ'] },
];

export function GestionarEstadosPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const visibles = useMemo(
    () => TABS.filter((t) => t.permisos.some((p) => hasPermission(p))),
    [hasPermission],
  );
  const [active, setActive] = useState<TabKey>(() => visibles[0]?.key ?? 'paquetes');

  const activeTab = visibles.find((t) => t.key === active) ?? visibles[0];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gestionar estados"
        description="Cambia el estado de paquetes, guías master o consolidados según las reglas de cada dominio."
      />

      {visibles.length > 1 && (
        <div className="inline-flex flex-wrap gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-1">
          {visibles.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab?.key === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-card)] text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {activeTab?.key === 'paquetes' && <GestionarEstadosPaquetesTab />}
      {activeTab?.key === 'guias' && <GestionarEstadosGuiasTab />}
      {activeTab?.key === 'consolidados' && <GestionarEstadosConsolidadosTab />}
    </div>
  );
}
