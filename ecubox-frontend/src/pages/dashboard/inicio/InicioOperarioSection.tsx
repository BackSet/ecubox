import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ChevronRight,
  ClipboardList,
  Clock,
  Package,
  PackageX,
  Plane,
  Truck,
  Weight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { KpiCard } from '@/components/KpiCard';
import { KpiCardsGrid } from '@/components/KpiCardsGrid';
import { SurfaceCard } from '@/components/ui/surface-card';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { useDashboardGuiasMaster } from '@/hooks/useGuiasMaster';
import {
  usePaquetesOperario,
  usePaquetesVencidosOperario,
} from '@/hooks/usePaquetesOperario';
import { usePaquetesSinSaca, useSacasOperario } from '@/hooks/useOperarioDespachos';
import { useEnviosConsolidados } from '@/hooks/useEnviosConsolidados';
import { GuiaMasterEstadoBadge } from '@/pages/dashboard/guias-master/_estado';

const ICON = 'h-5 w-5';

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

const QUICK_ACTIONS = [
  {
    label: 'Despachos',
    description: 'Crear y gestionar despachos',
    icon: Truck,
    to: '/despachos',
    permission: 'DESPACHOS_WRITE',
  },
  {
    label: 'Lotes de recepción',
    description: 'Registrar llegadas y peso',
    icon: ClipboardList,
    to: '/lotes-recepcion',
    permission: 'DESPACHOS_WRITE',
  },
  {
    label: 'Gestión de paquetes',
    description: 'Ver y actualizar estados',
    icon: Package,
    to: '/paquetes',
    permission: 'PAQUETES_READ',
  },
  {
    label: 'Envíos consolidados',
    description: 'Manifiestos y consolidados',
    icon: Plane,
    to: '/envios-consolidados',
    permission: 'ENVIOS_CONSOLIDADOS_READ',
  },
] as const;

function KpiSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-semibold text-[var(--color-foreground)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function InicioOperarioSection() {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const canGuiasMaster = hasPermission('GUIAS_MASTER_READ');
  const canPesoWrite = hasPermission('PAQUETES_PESO_WRITE');
  const canDespachos = hasPermission('DESPACHOS_WRITE');
  const canEnvios = hasPermission('ENVIOS_CONSOLIDADOS_READ');

  const { data: dashGM, isLoading: loadingDashGM } = useDashboardGuiasMaster(
    10,
    canGuiasMaster
  );
  const { data: vencidos, isLoading: loadingVencidos } =
    usePaquetesVencidosOperario(canPesoWrite);
  const { data: sinPeso, isLoading: loadingSinPeso } = usePaquetesOperario(
    true,
    canPesoWrite
  );
  const { data: sinSaca, isLoading: loadingSinSaca } = usePaquetesSinSaca(
    canPesoWrite
  );
  const { data: sacasPendientes, isLoading: loadingSacas } = useSacasOperario(
    true,
    canDespachos
  );
  const { data: enviosAbiertos, isLoading: loadingEnvios } = useEnviosConsolidados(
    { estado: 'ABIERTO', page: 0, size: 1 },
    canEnvios
  );

  const totalVencidos = vencidos?.length ?? 0;
  const totalSinPeso = sinPeso?.length ?? 0;
  const totalSinSaca = sinSaca?.length ?? 0;
  const totalSacasPend = sacasPendientes?.length ?? 0;
  const totalEnviosAbiertos = enviosAbiertos?.totalElements ?? 0;
  const totalCerradasConFaltante = dashGM?.totalCerradasConFaltante ?? 0;

  const cargandoGuias = canGuiasMaster && loadingDashGM && !dashGM;
  const cargandoOperacion =
    (canPesoWrite &&
      ((loadingVencidos && !vencidos) ||
        (loadingSinPeso && !sinPeso) ||
        (loadingSinSaca && !sinSaca))) ||
    (canDespachos && loadingSacas && !sacasPendientes) ||
    (canEnvios && loadingEnvios && !enviosAbiertos);

  const showOperacionSection = canPesoWrite || canDespachos || canEnvios;
  const operacionKpiCount =
    (canPesoWrite ? 4 : 0) + (canDespachos ? 1 : 0) + (canEnvios ? 1 : 0);

  const visibleActions = QUICK_ACTIONS.filter((a) =>
    a.permission ? hasPermission(a.permission) : true
  );

  return (
    <section className="page-stack">
      <header className="border-b border-[var(--color-border)] pb-4">
        <h1 className="text-[18px] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]">
          Panel operativo
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted-foreground)]">
          Estado actual de la operación y accesos rápidos.
        </p>
      </header>

      {canPesoWrite && totalVencidos > 0 && !cargandoOperacion && (
        <div className="ui-alert ui-alert-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--color-foreground)]">
                Hay {totalVencidos} paquete(s) que superaron el plazo de retiro
              </p>
              <p className="text-[13px] text-[var(--color-muted-foreground)]">
                Revísalos para gestionar el siguiente paso operativo.
              </p>
            </div>
            <Link
              to="/paquetes-vencidos"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-[13px] font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)]"
            >
              Ver paquetes vencidos
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      )}

      {canGuiasMaster && (
        <KpiSection title="Guías master">
          {cargandoGuias ? (
            <KpiCardsGridSkeleton count={2} />
          ) : (
            <KpiCardsGrid>
              <KpiCard
                icon={<Boxes className={ICON} strokeWidth={1.75} />}
                label="Guías activas"
                value={dashGM?.totalActivas ?? 0}
                hint={`${dashGM?.totalCerradas ?? 0} cerradas en total`}
                tone="primary"
                to="/guias-master"
              />
              <KpiCard
                icon={<AlertTriangle className={ICON} strokeWidth={1.75} />}
                label="Cerradas con faltante"
                value={totalCerradasConFaltante}
                hint={
                  totalCerradasConFaltante > 0
                    ? 'Requieren revisión'
                    : 'Sin novedades'
                }
                tone={totalCerradasConFaltante > 0 ? 'warning' : 'neutral'}
                to="/guias-master"
              />
            </KpiCardsGrid>
          )}
        </KpiSection>
      )}

      {showOperacionSection && (
        <KpiSection title="Operación diaria">
          {cargandoOperacion ? (
            <KpiCardsGridSkeleton count={operacionKpiCount} />
          ) : (
            <KpiCardsGrid>
              {canPesoWrite && (
                <KpiCard
                  icon={<Weight className={ICON} strokeWidth={1.75} />}
                  label="Paquetes sin peso"
                  value={totalSinPeso}
                  hint={
                    totalSinPeso > 0 ? 'Pendientes de pesaje' : 'Todo registrado'
                  }
                  tone={totalSinPeso > 0 ? 'warning' : 'success'}
                  to="/pesaje"
                />
              )}
              {canPesoWrite && (
                <KpiCard
                  icon={<PackageX className={ICON} strokeWidth={1.75} />}
                  label="Paquetes sin saca"
                  value={totalSinSaca}
                  hint={
                    totalSinSaca > 0 ? 'Asignar a saca' : 'Sin pendientes'
                  }
                  tone={totalSinSaca > 0 ? 'warning' : 'neutral'}
                  to="/paquetes"
                />
              )}
              {canPesoWrite && (
                <KpiCard
                  icon={<Clock className={ICON} strokeWidth={1.75} />}
                  label="Paquetes vencidos"
                  value={totalVencidos}
                  hint={
                    totalVencidos > 0
                      ? 'Superaron plazo de retiro'
                      : 'Al día'
                  }
                  tone={totalVencidos > 0 ? 'danger' : 'success'}
                  to="/paquetes-vencidos"
                />
              )}
              {canDespachos && (
                <KpiCard
                  icon={<Truck className={ICON} strokeWidth={1.75} />}
                  label="Sacas pendientes"
                  value={totalSacasPend}
                  hint="Sin asignar a despacho"
                  tone={totalSacasPend > 0 ? 'warning' : 'neutral'}
                  to="/despachos"
                />
              )}
              {canEnvios && (
                <KpiCard
                  icon={<Plane className={ICON} strokeWidth={1.75} />}
                  label="Envíos consolidados abiertos"
                  value={totalEnviosAbiertos}
                  hint="Manifiestos en curso"
                  tone="primary"
                  to="/envios-consolidados"
                />
              )}
            </KpiCardsGrid>
          )}
        </KpiSection>
      )}

      {canGuiasMaster && (dashGM?.topAntiguasSinCompletar?.length ?? 0) > 0 && (
        <SurfaceCard className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock
                className="h-4 w-4 text-[var(--color-muted-foreground)]"
                strokeWidth={1.75}
              />
              <h3 className="text-[13px] font-semibold text-[var(--color-foreground)]">
                Guías más antiguas sin completar
              </h3>
            </div>
            <Link
              to="/guias-master"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-foreground)] hover:underline"
            >
              Ver todas
              <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
            </Link>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {dashGM!.topAntiguasSinCompletar.slice(0, 5).map((g) => (
              <li key={g.id}>
                <Link
                  to="/guias-master/$id"
                  params={{ id: String(g.id) }}
                  className="-mx-2 flex items-center justify-between gap-3 rounded px-2 py-2.5 transition hover:bg-[var(--color-muted)]/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] text-[var(--color-foreground)]">
                      {g.trackingBase}
                    </p>
                    <p className="truncate text-[12px] text-[var(--color-muted-foreground)]">
                      {g.clienteUsuarioNombre ?? 'Sin cliente'}
                      {' · '}
                      {g.consignatarioNombre ?? 'Sin consignatario'}
                      {' · creada '}
                      {formatDateShort(g.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <GuiaMasterEstadoBadge estado={g.estadoGlobal} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      )}

      {visibleActions.length > 0 && (
        <SurfaceCard className="overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <h3 className="text-[13px] font-semibold text-[var(--color-foreground)]">
              Accesos rápidos
            </h3>
          </div>
          <ul>
            {visibleActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <li key={action.to}>
                  <Link
                    to={action.to}
                    className={`group flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--color-muted)]/60 ${
                      idx > 0 ? 'border-t border-[var(--color-border)]' : ''
                    }`}
                  >
                    <Icon
                      className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]"
                      strokeWidth={1.75}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[var(--color-foreground)]">
                        {action.label}
                      </p>
                      <p className="truncate text-[12px] text-[var(--color-muted-foreground)]">
                        {action.description}
                      </p>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] opacity-0 transition group-hover:opacity-100"
                      strokeWidth={1.75}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </SurfaceCard>
      )}
    </section>
  );
}
