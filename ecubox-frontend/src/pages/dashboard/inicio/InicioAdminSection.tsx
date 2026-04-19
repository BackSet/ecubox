import { Link } from '@tanstack/react-router';
import {
  Boxes,
  Building2,
  ChevronRight,
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
import { SurfaceCard } from '@/components/ui/surface-card';
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
      <header className="border-b border-[var(--color-border)] pb-4">
        <h1 className="text-[18px] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]">
          {username ? `Hola, ${username}` : 'Panel administrativo'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted-foreground)]">
          Resumen general del sistema y accesos rápidos a la administración.
        </p>
      </header>

      {cargando && !usuarios && !roles && !permisos ? (
        <LoadingState text="Cargando información administrativa..." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
              label="Usuarios totales"
              value={totalUsuarios}
              tone="primary"
              hint={`${usuariosActivos} activo(s)`}
              to="/usuarios"
            />
            <KpiCard
              icon={<UserCheck className="h-4 w-4" strokeWidth={1.75} />}
              label="Usuarios activos"
              value={usuariosActivos}
              tone={usuariosActivos > 0 ? 'success' : 'neutral'}
              hint="Pueden iniciar sesión"
              to="/usuarios"
            />
            <KpiCard
              icon={<UserX className="h-4 w-4" strokeWidth={1.75} />}
              label="Usuarios deshabilitados"
              value={usuariosInactivos}
              tone={usuariosInactivos > 0 ? 'warning' : 'neutral'}
              hint="Sin acceso al sistema"
              to="/usuarios"
            />
            <KpiCard
              icon={<Shield className="h-4 w-4" strokeWidth={1.75} />}
              label="Roles configurados"
              value={totalRoles}
              tone="neutral"
              to="/roles"
            />
            <KpiCard
              icon={<Key className="h-4 w-4" strokeWidth={1.75} />}
              label="Permisos disponibles"
              value={totalPermisos}
              tone="neutral"
              to="/permisos"
            />
            <KpiCard
              icon={<Building2 className="h-4 w-4" strokeWidth={1.75} />}
              label="Agencias"
              value={totalAgencias}
              tone="neutral"
              to="/agencias"
            />
            <KpiCard
              icon={<PackageCheck className="h-4 w-4" strokeWidth={1.75} />}
              label="Empresas de entrega"
              value={totalDistribuidores}
              tone="neutral"
              to="/distribuidores"
            />
            <KpiCard
              icon={<Settings className="h-4 w-4" strokeWidth={1.75} />}
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
                icon={<Boxes className="h-4 w-4" strokeWidth={1.75} />}
                label="Guías activas"
                value={dashGM.totalActivas ?? 0}
                hint={`${dashGM.totalCerradas ?? 0} cerradas en total`}
                tone="primary"
                to="/guias-master"
              />
              <KpiCard
                icon={<Truck className="h-4 w-4" strokeWidth={1.75} />}
                label="Despachos"
                value="—"
                hint="Gestión de salidas"
                tone="neutral"
                to="/despachos"
              />
              <KpiCard
                icon={<Plane className="h-4 w-4" strokeWidth={1.75} />}
                label="Envíos consolidados"
                value="—"
                hint="Manifiestos aéreos"
                tone="neutral"
                to="/envios-consolidados"
              />
            </div>
          )}

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
        </>
      )}
    </section>
  );
}
