import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Boxes,
  Building2,
  Key,
  PackageCheck,
  Plane,
  Settings,
  Shield,
  ShieldCheck,
  Truck,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { KpiCard } from '@/components/KpiCard';
import { SurfaceCard } from '@/components/ui/surface-card';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/LoadingState';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useRoles } from '@/hooks/useRoles';
import { usePermisos } from '@/hooks/usePermisos';
import { useAgencias } from '@/hooks/useAgencias';
import { useDistribuidoresAdmin } from '@/hooks/useDistribuidoresAdmin';
import { useDashboardGuiasMaster } from '@/hooks/useGuiasMaster';

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
    label: 'Empresas de entrega',
    description: 'Distribuidores y tarifas',
    icon: PackageCheck,
    to: '/distribuidores',
  },
] as const;

export function InicioAdminSection() {
  const username = useAuthStore((s) => s.username);

  const { data: usuarios, isLoading: loadingUsuarios } = useUsuarios();
  const { data: roles, isLoading: loadingRoles } = useRoles();
  const { data: permisos, isLoading: loadingPermisos } = usePermisos();
  const { data: agencias } = useAgencias();
  const { data: distribuidores } = useDistribuidoresAdmin();
  const { data: dashGM } = useDashboardGuiasMaster(5, true);

  const totalUsuarios = usuarios?.length ?? 0;
  const usuariosActivos = usuarios?.filter((u) => u.enabled).length ?? 0;
  const usuariosInactivos = totalUsuarios - usuariosActivos;
  const totalRoles = roles?.length ?? 0;
  const totalPermisos = permisos?.length ?? 0;
  const totalAgencias = agencias?.length ?? 0;
  const totalDistribuidores = distribuidores?.length ?? 0;

  const cargando = loadingUsuarios || loadingRoles || loadingPermisos;

  return (
    <section className="page-stack">
      <PageHeader
        title={username ? `Hola, ${username}` : 'Panel administrativo'}
        description="Resumen general del sistema y accesos rápidos a la administración."
      />

      {cargando && !usuarios && !roles && !permisos ? (
        <LoadingState text="Cargando información administrativa..." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={<Users className="h-5 w-5" />}
              label="Usuarios totales"
              value={totalUsuarios}
              tone="primary"
              hint={`${usuariosActivos} activo(s)`}
              to="/usuarios"
            />
            <KpiCard
              icon={<UserCheck className="h-5 w-5" />}
              label="Usuarios activos"
              value={usuariosActivos}
              tone={usuariosActivos > 0 ? 'success' : 'neutral'}
              hint="Pueden iniciar sesión"
              to="/usuarios"
            />
            <KpiCard
              icon={<UserX className="h-5 w-5" />}
              label="Usuarios deshabilitados"
              value={usuariosInactivos}
              tone={usuariosInactivos > 0 ? 'warning' : 'neutral'}
              hint="Sin acceso al sistema"
              to="/usuarios"
            />
            <KpiCard
              icon={<Shield className="h-5 w-5" />}
              label="Roles configurados"
              value={totalRoles}
              tone="neutral"
              to="/roles"
            />
            <KpiCard
              icon={<Key className="h-5 w-5" />}
              label="Permisos disponibles"
              value={totalPermisos}
              tone="neutral"
              to="/permisos"
            />
            <KpiCard
              icon={<Building2 className="h-5 w-5" />}
              label="Agencias"
              value={totalAgencias}
              tone="neutral"
              to="/agencias"
            />
            <KpiCard
              icon={<PackageCheck className="h-5 w-5" />}
              label="Empresas de entrega"
              value={totalDistribuidores}
              tone="neutral"
              to="/distribuidores"
            />
            <KpiCard
              icon={<Settings className="h-5 w-5" />}
              label="Parámetros"
              value="—"
              tone="neutral"
              hint="Configuración del sistema"
              to="/parametros-sistema"
            />
          </div>

          {dashGM && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                icon={<Boxes className="h-5 w-5" />}
                label="Guías activas"
                value={dashGM.totalActivas ?? 0}
                hint={`${dashGM.totalCerradas ?? 0} cerradas en total`}
                tone="primary"
                to="/guias-master"
              />
              <KpiCard
                icon={<Truck className="h-5 w-5" />}
                label="Despachos"
                value="—"
                hint="Gestión de salidas"
                tone="neutral"
                to="/despachos"
              />
              <KpiCard
                icon={<Plane className="h-5 w-5" />}
                label="Envíos consolidados"
                value="—"
                hint="Manifiestos aéreos"
                tone="neutral"
                to="/envios-consolidados"
              />
            </div>
          )}

          <SurfaceCard className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                Accesos rápidos
              </h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {ADMIN_QUICK_ACTIONS.map((action) => {
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
          </SurfaceCard>
        </>
      )}
    </section>
  );
}
