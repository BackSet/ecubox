import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import {
  Boxes,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  Key,
  MessageSquare,
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
import { Button } from '@/components/ui/button';
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
import { useEnviosConsolidados } from '@/hooks/useEnviosConsolidados';
import { useCanalesComunicacion } from '@/hooks/useCanalesComunicacion';

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
  // Solo necesitamos el conteo total: pedimos una página mínima.
  const { data: enviosConsolidadosPage } = useEnviosConsolidados({ page: 0, size: 1 });
  const { data: canales } = useCanalesComunicacion();

  const totalEnviosConsolidados = enviosConsolidadosPage?.totalElements ?? 0;
  const canalesConfigurados = canales
    ? Object.values(canales).filter((c) => c.valor.trim().length > 0).length
    : 0;
  const totalUsuarios = usuarios?.length ?? 0;
  const usuariosActivos = usuarios?.filter((u) => u.enabled).length ?? 0;
  const usuariosInactivos = totalUsuarios - usuariosActivos;
  const totalRoles = roles?.length ?? 0;
  const totalPermisos = permisos?.length ?? 0;
  const totalAgencias = agencias?.length ?? 0;
  const totalCouriersEntrega = couriersEntrega?.length ?? 0;
  const totalDespachos = despachos?.length ?? 0;
  const paquetesDespachados = (paquetes ?? []).filter((p) => p.despachoId != null).length;

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
          {dashGM && (
            <section aria-labelledby="inicio-operacion">
              <SectionLabel id="inicio-operacion">Operación</SectionLabel>
              <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-3 sm:gap-3">
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
                  value={totalDespachos}
                  hint={`${paquetesDespachados} paquete(s) en salida`}
                  tone={totalDespachos > 0 ? 'success' : 'neutral'}
                  to="/despachos"
                />
                <KpiCard
                  icon={<Plane className="h-5 w-5" strokeWidth={1.75} />}
                  label="Envíos consolidados"
                  value={totalEnviosConsolidados}
                  hint="Manifiestos aéreos creados"
                  tone={totalEnviosConsolidados > 0 ? 'primary' : 'neutral'}
                  to="/envios-consolidados"
                />
              </div>
            </section>
          )}

          <section aria-labelledby="inicio-admin">
            <SectionLabel id="inicio-admin">Administración</SectionLabel>
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
                icon={<MessageSquare className="h-5 w-5" strokeWidth={1.75} />}
                label="Canales de contacto"
                value={canalesConfigurados}
                tone={canalesConfigurados > 0 ? 'success' : 'neutral'}
                hint="Configurados en parámetros"
                to="/parametros-sistema"
              />
            </KpiCardsGrid>
          </section>

          <SurfaceCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <ChartNoAxesCombined className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-[13px] font-semibold text-[var(--color-foreground)]">
                  Estadísticas operativas
                </h3>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-muted-foreground)]">
                  Tendencias, tiempos de despacho, proyecciones y paquetes demorados.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
              <Link to="/estadisticas">
                Ver estadísticas
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
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

function SectionLabel({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]"
    >
      {children}
    </h2>
  );
}
