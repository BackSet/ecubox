import { Link } from '@tanstack/react-router';
import { Truck, Package, ClipboardList, ArrowRight, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePaquetesVencidosOperario } from '@/hooks/usePaquetesOperario';

const QUICK_ACTIONS = [
  {
    label: 'Despachos del día',
    description: 'Crear y gestionar despachos',
    icon: Truck,
    to: '/despachos',
    color: 'text-[var(--color-primary)]',
    permission: 'DESPACHOS_WRITE',
  },
  {
    label: 'Paquetes',
    description: 'Ver y actualizar estados',
    icon: Package,
    to: '/paquetes',
    color: 'text-[var(--color-accent)]',
    permission: 'PAQUETES_READ',
  },
  {
    label: 'Lotes de recepción',
    description: 'Registrar llegadas y peso',
    icon: ClipboardList,
    to: '/lotes-recepcion',
    color: 'text-[var(--color-success)]',
    permission: 'DESPACHOS_WRITE',
  },
] as const;

export function DashboardPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canSeeVencidos = hasPermission('PAQUETES_PESO_WRITE');
  const { data: paquetesVencidos } = usePaquetesVencidosOperario(canSeeVencidos);
  const totalVencidos = paquetesVencidos?.length ?? 0;
  const visibleActions = QUICK_ACTIONS.filter((action) =>
    action.permission ? hasPermission(action.permission) : true
  );

  return (
    <div className="space-y-6">
      <div className="surface-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Panel operativo
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Accesos rápidos a los módulos principales.
        </p>
      </div>

      {canSeeVencidos && totalVencidos > 0 ? (
        <div className="surface-card border-[var(--color-warning)]/35 bg-[var(--color-warning)]/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="rounded-full bg-[var(--color-warning)]/20 p-2 text-[var(--color-warning)]">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  Hay {totalVencidos} paquete(s) que superaron el plazo de retiro
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Revísalos para gestionar el siguiente paso operativo.
                </p>
              </div>
            </div>
            <Link
              to="/paquetes-vencidos"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition"
            >
              Ver paquetes vencidos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.to}
              to={action.to}
              className="surface-card group flex items-start gap-4 p-5 transition hover:shadow-md"
            >
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-muted)] ${action.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                  {action.label}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  {action.description}
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] opacity-0 transition group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
