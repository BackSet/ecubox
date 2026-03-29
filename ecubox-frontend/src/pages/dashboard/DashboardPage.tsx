import { Link } from '@tanstack/react-router';
import { Truck, Package, ClipboardList, ArrowRight } from 'lucide-react';

const QUICK_ACTIONS = [
  {
    label: 'Despachos del día',
    description: 'Crear y gestionar despachos',
    icon: Truck,
    to: '/despachos',
    color: 'text-[var(--color-primary)]',
  },
  {
    label: 'Paquetes',
    description: 'Ver y actualizar estados',
    icon: Package,
    to: '/paquetes',
    color: 'text-[var(--color-accent)]',
  },
  {
    label: 'Lotes de recepción',
    description: 'Registrar llegadas y peso',
    icon: ClipboardList,
    to: '/lotes-recepcion',
    color: 'text-[var(--color-success)]',
  },
] as const;

export function DashboardPage() {
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

      <div className="grid gap-4 md:grid-cols-3">
        {QUICK_ACTIONS.map((action) => {
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
