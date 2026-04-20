import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Boxes,
  Users,
  Truck,
  AlertCircle,
  ArrowRight,
  Plus,
  PackageSearch,
  Plane,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useMiInicioDashboard } from '@/hooks/useMisGuias';
import { KpiCard } from '@/components/KpiCard';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Button } from '@/components/ui/button';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { ListItemsSkeleton } from '@/components/skeletons/ListItemsSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GuiaMasterEstadoBadge,
  GUIA_MASTER_ESTADO_LABELS,
} from '@/pages/dashboard/guias-master/_estado';
import { RegistrarMiGuiaDialog } from '@/pages/dashboard/mis-guias/RegistrarMiGuiaDialog';
import type { GuiaMaster } from '@/types/guia-master';

function formatDateShort(value?: string | null) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return d.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function InicioClienteSection() {
  const username = useAuthStore((s) => s.username);
  const hasMisGuiasCreate = useAuthStore((s) => s.hasPermission('MIS_GUIAS_CREATE'));
  const { data, isLoading, error } = useMiInicioDashboard();
  const [registrarOpen, setRegistrarOpen] = useState(false);

  if (isLoading && !data) {
    return (
      <section className="page-stack" aria-busy="true" aria-live="polite">
        <header className="flex flex-col gap-2 border-b border-[var(--color-border)] pb-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
        </header>
        <KpiCardsGridSkeleton count={4} gridClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" />
        <div className="grid gap-4 lg:grid-cols-2">
          <SurfaceCard className="p-4">
            <Skeleton className="mb-3 h-4 w-40" />
            <ListItemsSkeleton rows={4} withTrailing />
          </SurfaceCard>
          <SurfaceCard className="p-4">
            <Skeleton className="mb-3 h-4 w-40" />
            <ListItemsSkeleton rows={4} withTrailing />
          </SurfaceCard>
        </div>
        <span className="sr-only">Cargando tu resumen...</span>
      </section>
    );
  }

  if (error || !data) {
    return (
      <SurfaceCard className="p-4 text-sm text-[var(--color-destructive)]">
        No pudimos cargar tu resumen. Intenta recargar la página.
      </SurfaceCard>
    );
  }

  if (data.totalGuias === 0) {
    return null;
  }

  return (
    <section className="page-stack">
      <header className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[18px] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]">
            {username ? `Hola, ${username}` : 'Bienvenido'}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-muted-foreground)]">
            Resumen de tus guías y envíos.
          </p>
        </div>
        {hasMisGuiasCreate && (
          <Button onClick={() => setRegistrarOpen(true)}>
            <Plus className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Registrar guía
          </Button>
        )}
      </header>

      {data.totalGuiasSinTotalDefinido > 0 && (
        <div className="ui-alert ui-alert-warning">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[var(--color-foreground)]">
              {data.totalGuiasSinTotalDefinido === 1
                ? '1 guía pendiente de revisar'
                : `${data.totalGuiasSinTotalDefinido} guías pendientes de revisar`}
            </p>
            <p className="text-[13px] text-[var(--color-muted-foreground)]">
              El operario aún debe confirmar el total de piezas. Te avisaremos cuando esté listo.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Boxes className="h-4 w-4" strokeWidth={1.75} />}
          label="Total de guías"
          value={data.totalGuias}
          tone="primary"
          to="/mis-guias"
          hint="Toca para ver el detalle"
        />
        <KpiCard
          icon={<Truck className="h-4 w-4" strokeWidth={1.75} />}
          label="Activas"
          value={data.totalGuiasActivas}
          tone="neutral"
          hint={`${data.piezasEnTransito} pieza(s) en tránsito`}
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4" strokeWidth={1.75} />}
          label="Pendientes de revisar"
          value={data.totalGuiasSinTotalDefinido}
          tone={data.totalGuiasSinTotalDefinido > 0 ? 'warning' : 'neutral'}
          hint="A la espera del operario"
        />
        <KpiCard
          icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
          label="Consignatarios"
          value={data.totalConsignatarios}
          tone="neutral"
          to="/consignatarios"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListaGuiasCard
          title="Tus guías recientes"
          icon={<Boxes className="h-4 w-4" strokeWidth={1.75} />}
          emptyText="Aún no hay guías recientes."
          guias={data.guiasRecientes}
          showFecha="created"
        />
        <ListaGuiasCard
          title="Próximas a despacharse"
          icon={<Plane className="h-4 w-4" strokeWidth={1.75} />}
          emptyText="Cuando una guía empiece a recibirse aparecerá aquí."
          guias={data.guiasProximasACerrar}
          showFecha="recepcion"
        />
      </div>

      <SurfaceCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-4 w-4 text-[var(--color-muted-foreground)]" strokeWidth={1.75} />
            <p className="text-[13px] text-[var(--color-foreground)]">
              ¿Quieres rastrear una pieza específica?
            </p>
          </div>
          <Link
            to="/tracking"
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-[13px] font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition"
          >
            Tracking público
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      </SurfaceCard>

      {registrarOpen && (
        <RegistrarMiGuiaDialog onClose={() => setRegistrarOpen(false)} />
      )}
    </section>
  );
}

function ListaGuiasCard({
  title,
  icon,
  emptyText,
  guias,
  showFecha,
}: {
  title: string;
  icon: React.ReactNode;
  emptyText: string;
  guias: GuiaMaster[];
  showFecha: 'created' | 'recepcion';
}) {
  return (
    <SurfaceCard className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-muted-foreground)]">{icon}</span>
          <h3 className="text-[13px] font-semibold text-[var(--color-foreground)]">{title}</h3>
        </div>
        <Link
          to="/mis-guias"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-foreground)] hover:underline"
        >
          Ver todas
          <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
        </Link>
      </div>
      {guias.length === 0 ? (
        <p className="text-[13px] text-[var(--color-muted-foreground)]">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {guias.map((g) => (
            <li key={g.id}>
              <Link
                to="/mis-guias/$id"
                params={{ id: String(g.id) }}
                className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-[var(--color-muted)]/50 -mx-2 px-2 rounded"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[13px] text-[var(--color-foreground)]">
                    {g.trackingBase}
                  </p>
                  <p className="truncate text-[12px] text-[var(--color-muted-foreground)]">
                    {g.consignatarioNombre ?? 'Sin consignatario'}
                    {' · '}
                    {formatDateShort(
                      showFecha === 'recepcion'
                        ? (g.fechaPrimeraRecepcion ?? g.createdAt)
                        : g.createdAt
                    )}
                  </p>
                </div>
                <div className="shrink-0">
                  <GuiaMasterEstadoBadge estado={g.estadoGlobal} />
                  <p className="mt-1 text-right text-[10px] text-[var(--color-muted-foreground)]">
                    {GUIA_MASTER_ESTADO_LABELS[g.estadoGlobal]}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}
