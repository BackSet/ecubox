import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import {
  AlertCircle,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  Clock,
  DollarSign,
  Key,
  PackageCheck,
  Plane,
  Settings,
  Shield,
  Truck,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { KpiCard } from '@/components/KpiCard';
import { KpiCardsGrid } from '@/components/KpiCardsGrid';
import { SurfaceCard } from '@/components/ui/surface-card';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { ListItemsSkeleton } from '@/components/skeletons/ListItemsSkeleton';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useRoles } from '@/hooks/useRoles';
import { usePermisos } from '@/hooks/usePermisos';
import { useAgencias } from '@/hooks/useAgencias';
import { useCouriersEntregaAdmin } from '@/hooks/useCouriersEntregaAdmin';
import { useDashboardGuiasMaster } from '@/hooks/useGuiasMaster';
import { usePaquetes } from '@/hooks/usePaquetes';
import { useDespachos } from '@/hooks/useOperarioDespachos';

const ADMIN_QUICK_ACTIONS = [
  {
    label: 'Usuarios',
    description: 'Crear y gestionar cuentas',
    icon: Users,
    to: '/usuarios',
  },
  {
    label: 'Roles de acceso',
    description: 'Definir qué puede hacer cada rol',
    icon: Shield,
    to: '/roles',
  },
  {
    label: 'Permisos',
    description: 'Catálogo de permisos del sistema',
    icon: Key,
    to: '/permisos',
  },
  {
    label: 'Parámetros del sistema',
    description: 'Configuración general',
    icon: Settings,
    to: '/parametros-sistema',
  },
  {
    label: 'Agencias',
    description: 'Oficinas de origen y destino',
    icon: Building2,
    to: '/agencias',
  },
  {
    label: 'Couriers de entrega',
    description: 'Couriers y tarifas',
    icon: PackageCheck,
    to: '/couriers-entrega',
  },
] as const;

export function InicioAdminSection() {
  const username = useAuthStore((s) => s.username);

  const { data: usuarios, isLoading: loadingUsuarios } = useUsuarios();
  const { data: roles, isLoading: loadingRoles } = useRoles();
  const { data: permisos, isLoading: loadingPermisos } = usePermisos();
  const { data: agencias } = useAgencias();
  const { data: couriersEntrega } = useCouriersEntregaAdmin();
  const { data: dashGM } = useDashboardGuiasMaster(5, true);
  const { data: paquetes, isLoading: loadingPaquetes } = usePaquetes();
  const { data: despachos, isLoading: loadingDespachos } = useDespachos();

  const totalUsuarios = usuarios?.length ?? 0;
  const usuariosActivos = usuarios?.filter((u) => u.enabled).length ?? 0;
  const usuariosInactivos = totalUsuarios - usuariosActivos;
  const totalRoles = roles?.length ?? 0;
  const totalPermisos = permisos?.length ?? 0;
  const totalAgencias = agencias?.length ?? 0;
  const totalCouriersEntrega = couriersEntrega?.length ?? 0;
  const analytics = buildAdminAnalytics(paquetes ?? [], despachos ?? [], usuarios ?? []);

  const cargando =
    loadingUsuarios || loadingRoles || loadingPermisos || loadingPaquetes || loadingDespachos;

  return (
    <section className="page-stack">
      <header className="border-b border-[var(--color-border)] pb-4">
        <h1 className="text-[18px] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]">
          {username ? `Hola, ${username}` : 'Panel administrativo'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted-foreground)]">
          Resumen general del sistema y accesos rápidos a la administración.
        </p>
      </header>

      {cargando && !usuarios && !roles && !permisos ? (
        <div aria-busy="true" aria-live="polite" className="space-y-4">
          <KpiCardsGridSkeleton count={8} />
          <KpiCardsGridSkeleton count={3} />
          <SurfaceCard className="overflow-hidden">
            <ListItemsSkeleton rows={6} withTrailing />
          </SurfaceCard>
          <span className="sr-only">Cargando información administrativa...</span>
        </div>
      ) : (
        <>
          <KpiCardsGrid>
            <KpiCard
              icon={<Users className="h-5 w-5" strokeWidth={1.75} />}
              label="Usuarios totales"
              value={totalUsuarios}
              tone="primary"
              hint={`${usuariosActivos} activo(s)`}
              to="/usuarios"
            />
            <KpiCard
              icon={<UserCheck className="h-5 w-5" strokeWidth={1.75} />}
              label="Usuarios activos"
              value={usuariosActivos}
              tone={usuariosActivos > 0 ? 'success' : 'neutral'}
              hint="Pueden iniciar sesión"
              to="/usuarios"
            />
            <KpiCard
              icon={<UserX className="h-5 w-5" strokeWidth={1.75} />}
              label="Usuarios deshabilitados"
              value={usuariosInactivos}
              tone={usuariosInactivos > 0 ? 'warning' : 'neutral'}
              hint="Sin acceso al sistema"
              to="/usuarios"
            />
            <KpiCard
              icon={<Shield className="h-5 w-5" strokeWidth={1.75} />}
              label="Roles configurados"
              value={totalRoles}
              tone="neutral"
              hint={`${totalPermisos} permisos asignables`}
              to="/roles"
            />
            <KpiCard
              icon={<Key className="h-5 w-5" strokeWidth={1.75} />}
              label="Permisos disponibles"
              value={totalPermisos}
              tone="neutral"
              hint="Catálogo de acciones del sistema"
              to="/permisos"
            />
            <KpiCard
              icon={<Building2 className="h-5 w-5" strokeWidth={1.75} />}
              label="Agencias"
              value={totalAgencias}
              tone="neutral"
              hint="Oficinas de origen y destino"
              to="/agencias"
            />
            <KpiCard
              icon={<PackageCheck className="h-5 w-5" strokeWidth={1.75} />}
              label="Couriers de entrega"
              value={totalCouriersEntrega}
              tone="neutral"
              hint="Operadores de última milla"
              to="/couriers-entrega"
            />
            <KpiCard
              icon={<Settings className="h-5 w-5" strokeWidth={1.75} />}
              label="Parámetros"
              value="—"
              tone="neutral"
              hint="Configuración del sistema"
              to="/parametros-sistema"
            />
          </KpiCardsGrid>

          {dashGM && (
            <KpiCardsGrid>
              <KpiCard
                icon={<Boxes className="h-5 w-5" strokeWidth={1.75} />}
                label="Guías activas"
                value={dashGM.totalActivas ?? 0}
                hint={`${dashGM.totalCerradas ?? 0} cerradas en total`}
                tone="primary"
                to="/guias-master"
              />
              <KpiCard
                icon={<Truck className="h-5 w-5" strokeWidth={1.75} />}
                label="Despachos"
                value={analytics.totalDespachos}
                hint={`${analytics.totalPaquetesDespachados} paquete(s) en salida`}
                tone={analytics.totalDespachos > 0 ? 'success' : 'neutral'}
                to="/despachos"
              />
              <KpiCard
                icon={<Plane className="h-5 w-5" strokeWidth={1.75} />}
                label="Envíos consolidados"
                value="—"
                hint="Manifiestos aéreos"
                tone="neutral"
                to="/envios-consolidados"
              />
            </KpiCardsGrid>
          )}

          <KpiCardsGrid>
            <KpiCard
              icon={<PackageCheck className="h-5 w-5" strokeWidth={1.75} />}
              label="Paquetes por estado"
              value={analytics.totalPaquetes}
              hint={analytics.estadoPrincipal}
              tone="primary"
              to="/paquetes"
            />
            <KpiCard
              icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />}
              label="Ingresos estimados"
              value={analytics.ingresoEstimado}
              hint="Referencia operativa por peso registrado"
              tone="success"
              to="/tarifa-calculadora"
            />
            <KpiCard
              icon={<Clock className="h-5 w-5" strokeWidth={1.75} />}
              label="Tiempo USA → Ecuador"
              value={analytics.tiempoPromedio}
              hint="Desde registro hasta despacho, si hay fechas"
              tone="neutral"
              to="/paquetes"
            />
            <KpiCard
              icon={<Truck className="h-5 w-5" strokeWidth={1.75} />}
              label="Courier destacado"
              value={analytics.courierPrincipal.label}
              hint={`${analytics.courierPrincipal.count} despacho(s)`}
              tone="info"
              to="/despachos"
            />
          </KpiCardsGrid>

          <div className="grid gap-4 xl:grid-cols-3">
            <AdminInsightList
              title="Estados con más paquetes"
              icon={<ChartNoAxesCombined className="h-4 w-4" />}
              items={analytics.estadosTop}
              empty="Sin paquetes registrados."
            />
            <AdminInsightList
              title="Despachos por operario"
              icon={<UserCheck className="h-4 w-4" />}
              items={analytics.operariosTop}
              empty="Sin despachos con operario."
            />
            <AdminInsightList
              title="Clientes frecuentes"
              icon={<Users className="h-4 w-4" />}
              items={analytics.clientesTop}
              empty="Sin actividad de clientes."
            />
          </div>

          <SurfaceCard className="p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
                <AlertCircle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-[13px] font-semibold text-[var(--color-foreground)]">
                  Reclamos por categoría
                </h3>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted-foreground)]">
                  Aún no hay un módulo de reclamos conectado. Cuando se cree, este
                  panel puede mostrar daños, demoras, paquetes perdidos, devoluciones
                  y errores de datos.
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="overflow-hidden">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <h3 className="text-[13px] font-semibold text-[var(--color-foreground)]">
                Accesos rápidos
              </h3>
            </div>
            <ul>
              {ADMIN_QUICK_ACTIONS.map((action, idx) => {
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
                        className="h-5 w-5 shrink-0 text-[var(--color-muted-foreground)]"
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
                        className="h-5 w-5 shrink-0 text-[var(--color-muted-foreground)] opacity-0 transition group-hover:opacity-100"
                        strokeWidth={1.75}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </SurfaceCard>
        </>
      )}
    </section>
  );
}

function AdminInsightList({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: ReactNode;
  items: Array<{ label: string; count: number; hint?: string }>;
  empty: string;
}) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--color-foreground)]">
          {icon}
          {title}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-[12px] text-[var(--color-muted-foreground)]">
          {empty}
        </p>
      ) : (
        <ul>
          {items.map((item, idx) => (
            <li
              key={`${item.label}-${idx}`}
              className={`flex items-center justify-between gap-3 px-4 py-3 ${
                idx > 0 ? 'border-t border-[var(--color-border)]' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[var(--color-foreground)]">
                  {item.label}
                </p>
                {item.hint ? (
                  <p className="truncate text-[11px] text-[var(--color-muted-foreground)]">
                    {item.hint}
                  </p>
                ) : null}
              </div>
              <span className="rounded-md bg-[var(--color-muted)] px-2 py-1 text-xs font-semibold tabular-nums text-[var(--color-foreground)]">
                {item.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}

function buildAdminAnalytics(
  paquetes: Array<{
    estadoRastreoNombre?: string;
    pesoLbs?: number;
    fechaEstadoDesde?: string;
    despachoId?: number;
    consignatarioNombre?: string;
  }>,
  despachos: Array<{
    id?: number;
    fechaHora?: string;
    courierEntregaNombre?: string;
    operarioNombre?: string;
  }>,
  usuarios: Array<{ roles?: string[] }>
) {
  const estados = new Map<string, number>();
  const clientes = new Map<string, number>();
  let pesoTotal = 0;

  for (const paquete of paquetes) {
    const estado = paquete.estadoRastreoNombre ?? 'Sin estado';
    estados.set(estado, (estados.get(estado) ?? 0) + 1);
    if (paquete.consignatarioNombre) {
      clientes.set(paquete.consignatarioNombre, (clientes.get(paquete.consignatarioNombre) ?? 0) + 1);
    }
    pesoTotal += Number(paquete.pesoLbs ?? 0);
  }

  const couriers = new Map<string, number>();
  const operarios = new Map<string, number>();
  for (const despacho of despachos) {
    if (despacho.courierEntregaNombre) {
      couriers.set(despacho.courierEntregaNombre, (couriers.get(despacho.courierEntregaNombre) ?? 0) + 1);
    }
    if (despacho.operarioNombre) {
      operarios.set(despacho.operarioNombre, (operarios.get(despacho.operarioNombre) ?? 0) + 1);
    }
  }

  const topEstado = topFromMap(estados, 1)[0];
  const topCourier = topFromMap(couriers, 1)[0] ?? { label: '—', count: 0 };
  const clientesUsuarios = usuarios.filter((u) => u.roles?.includes('CLIENTE')).length;
  const clientesTop = topFromMap(clientes, 5);

  return {
    totalPaquetes: paquetes.length,
    totalDespachos: despachos.length,
    totalPaquetesDespachados: paquetes.filter((p) => p.despachoId != null).length,
    estadoPrincipal: topEstado ? `${topEstado.label}: ${topEstado.count}` : 'Sin estados registrados',
    ingresoEstimado: formatMoney(pesoTotal * 2.75),
    tiempoPromedio: estimateAverageTransit(paquetes, despachos),
    courierPrincipal: topCourier,
    estadosTop: topFromMap(estados, 5),
    operariosTop: topFromMap(operarios, 5),
    clientesTop:
      clientesTop.length > 0
        ? clientesTop
        : clientesUsuarios > 0
          ? [{ label: 'Clientes registrados', count: clientesUsuarios }]
          : [],
  };
}

function topFromMap(map: Map<string, number>, limit: number) {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'))
    .slice(0, limit);
}

function estimateAverageTransit(
  paquetes: Array<{ fechaEstadoDesde?: string; despachoId?: number }>,
  despachos: Array<{ id?: number; fechaHora?: string }>
): string {
  const despachoDateById = new Map<number, number>();
  for (const despacho of despachos) {
    if (despacho.id == null || !despacho.fechaHora) continue;
    const date = new Date(despacho.fechaHora).getTime();
    if (Number.isFinite(date)) despachoDateById.set(despacho.id, date);
  }
  if (despachoDateById.size === 0) return '—';
  const deltas = paquetes
    .map((p) => {
      if (!p.fechaEstadoDesde || p.despachoId == null) return NaN;
      const dispatchDate = despachoDateById.get(p.despachoId);
      if (dispatchDate == null) return NaN;
      const start = new Date(p.fechaEstadoDesde).getTime();
      return Number.isFinite(start) ? dispatchDate - start : NaN;
    })
    .filter((ms) => Number.isFinite(ms) && ms >= 0);
  if (deltas.length === 0) return '—';
  const avgDays = deltas.reduce((sum, ms) => sum + ms, 0) / deltas.length / 86_400_000;
  return `${avgDays.toFixed(1)} días`;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
