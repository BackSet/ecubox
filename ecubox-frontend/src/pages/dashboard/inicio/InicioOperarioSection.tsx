import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
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
import { SurfaceCard } from '@/components/ui/surface-card';
import { PageHeader } from '@/components/PageHeader';
import { useDashboardGuiasMaster } from '@/hooks/useGuiasMaster';
import {
  usePaquetesOperario,
  usePaquetesVencidosOperario,
} from '@/hooks/usePaquetesOperario';
import { usePaquetesSinSaca, useSacasOperario } from '@/hooks/useOperarioDespachos';
import { useEnviosConsolidados } from '@/hooks/useEnviosConsolidados';
import { GuiaMasterEstadoBadge } from '@/pages/dashboard/guias-master/_estado';

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

export function InicioOperarioSection() {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const canGuiasMaster = hasPermission('GUIAS_MASTER_READ');
  const canPesoWrite = hasPermission('PAQUETES_PESO_WRITE');
  const canDespachos = hasPermission('DESPACHOS_WRITE');
  const canEnvios = hasPermission('ENVIOS_CONSOLIDADOS_READ');

  const { data: dashGM } = useDashboardGuiasMaster(10, canGuiasMaster);
  const { data: vencidos } = usePaquetesVencidosOperario(canPesoWrite);
  const { data: sinPeso } = usePaquetesOperario(true, canPesoWrite);
  const { data: sinSaca } = usePaquetesSinSaca(canPesoWrite);
  const { data: sacasPendientes } = useSacasOperario(true, canDespachos);
  const { data: enviosAbiertos } = useEnviosConsolidados(
    { estado: 'ABIERTO', page: 0, size: 1 },
    canEnvios
  );

  const totalVencidos = vencidos?.length ?? 0;
  const totalSinPeso = sinPeso?.length ?? 0;
  const totalSinSaca = sinSaca?.length ?? 0;
  const totalSacasPend = sacasPendientes?.length ?? 0;
  const totalEnviosAbiertos = enviosAbiertos?.totalElements ?? 0;

  const visibleActions = QUICK_ACTIONS.filter((a) =>
    a.permission ? hasPermission(a.permission) : true
  );

  return (
    <section className="page-stack">
      <PageHeader
        title="Panel operativo"
        description="Estado actual de la operación y accesos rápidos."
      />

      {canPesoWrite && totalVencidos > 0 && (
        <div className="ui-alert ui-alert-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex flex-wrap items-center justify-between gap-3 flex-1 min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                Hay {totalVencidos} paquete(s) que superaron el plazo de retiro
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Revísalos para gestionar el siguiente paso operativo.
              </p>
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
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {canGuiasMaster && (
          <KpiCard
            icon={<Boxes className="h-5 w-5" />}
            label="Guías activas"
            value={dashGM?.totalActivas ?? 0}
            hint={`${dashGM?.totalCerradas ?? 0} cerradas en total`}
            tone="primary"
            to="/guias-master"
          />
        )}
        {canGuiasMaster && (
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Cerradas con faltante"
            value={dashGM?.totalCerradasConFaltante ?? 0}
            tone={(dashGM?.totalCerradasConFaltante ?? 0) > 0 ? 'warning' : 'neutral'}
            to="/guias-master"
          />
        )}
        {canPesoWrite && (
          <KpiCard
            icon={<Weight className="h-5 w-5" />}
            label="Paquetes sin peso"
            value={totalSinPeso}
            tone={totalSinPeso > 0 ? 'warning' : 'success'}
            to="/cargar-pesos"
          />
        )}
        {canPesoWrite && (
          <KpiCard
            icon={<PackageX className="h-5 w-5" />}
            label="Paquetes sin saca"
            value={totalSinSaca}
            tone={totalSinSaca > 0 ? 'warning' : 'neutral'}
            to="/paquetes"
          />
        )}
        {canPesoWrite && (
          <KpiCard
            icon={<Clock className="h-5 w-5" />}
            label="Paquetes vencidos"
            value={totalVencidos}
            tone={totalVencidos > 0 ? 'danger' : 'success'}
            to="/paquetes-vencidos"
          />
        )}
        {canDespachos && (
          <KpiCard
            icon={<Truck className="h-5 w-5" />}
            label="Sacas pendientes"
            value={totalSacasPend}
            hint="Sin asignar a despacho"
            tone={totalSacasPend > 0 ? 'warning' : 'neutral'}
            to="/despachos"
          />
        )}
        {canEnvios && (
          <KpiCard
            icon={<Plane className="h-5 w-5" />}
            label="Envíos consolidados abiertos"
            value={totalEnviosAbiertos}
            tone="primary"
            to="/envios-consolidados"
          />
        )}
      </div>

      {canGuiasMaster && (dashGM?.topAntiguasSinCompletar?.length ?? 0) > 0 && (
        <SurfaceCard className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                Guías más antiguas sin completar
              </h3>
            </div>
            <Link
              to="/guias-master"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              Ver todas
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {dashGM!.topAntiguasSinCompletar.slice(0, 5).map((g) => (
              <li key={g.id}>
                <Link
                  to="/guias-master/$id"
                  params={{ id: String(g.id) }}
                  className="-mx-2 flex items-center justify-between gap-3 rounded px-2 py-2.5 transition hover:bg-[var(--color-muted)]/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm text-[var(--color-foreground)]">
                      {g.trackingBase}
                    </p>
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                      {g.clienteUsuarioNombre ?? 'Sin cliente'}
                      {' · '}
                      {g.destinatarioNombre ?? 'Sin destinatario'}
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
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="surface-card group flex items-start gap-3 p-4 transition hover:shadow-md"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-muted)] text-[var(--color-foreground)]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                    {action.label}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] opacity-0 transition group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
