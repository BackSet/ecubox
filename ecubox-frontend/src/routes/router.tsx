import { createRootRoute, createRoute, createRouter, RouterProvider, Outlet, redirect } from '@tanstack/react-router';
import { useEffect, type ComponentType } from 'react';
import { AppToaster } from '@/components/ui/sonner';
import { HomePage } from '@/pages/home/HomePage';
import { LoginPage } from '@/pages/login/LoginPage';
import { RegistroSimplePage } from '@/pages/registro/RegistroSimplePage';
import { DashboardLayout } from '@/pages/dashboard/DashboardLayout';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { UsuarioList } from '@/pages/dashboard/usuarios/UsuarioList';
import { RolList } from '@/pages/dashboard/roles/RolList';
import { PermisoList } from '@/pages/dashboard/permisos/PermisoList';
import { DestinatarioListPage } from '@/pages/dashboard/destinatarios/DestinatarioListPage';
import { PaqueteListPage } from '@/pages/dashboard/paquetes/PaqueteListPage';
import { PaquetesVencidosPage } from '@/pages/dashboard/paquetes/PaquetesVencidosPage';
import { CargarPesosPage } from '@/pages/dashboard/cargar-pesos/CargarPesosPage';
import { GuiasMasterPage } from '@/pages/dashboard/guias-master/GuiasMasterPage';
import { GuiaMasterDetailPage } from '@/pages/dashboard/guias-master/GuiaMasterDetailPage';
import { MisGuiasListPage } from '@/pages/dashboard/mis-guias/MisGuiasListPage';
import { MiGuiaDetailPage } from '@/pages/dashboard/mis-guias/MiGuiaDetailPage';
import { EnviosConsolidadosListPage } from '@/pages/dashboard/envios-consolidados/EnviosConsolidadosListPage';
import { EnvioConsolidadoDetailPage } from '@/pages/dashboard/envios-consolidados/EnvioConsolidadoDetailPage';
import { GestionarEstadosPaquetesPage } from '@/pages/dashboard/gestionar-estados-paquetes/GestionarEstadosPaquetesPage';
import { DespachoListPage } from '@/pages/dashboard/despachos/DespachoListPage';
import { DespachoDetailPage } from '@/pages/dashboard/despachos/DespachoDetailPage';
import { EditarDespachoPage } from '@/pages/dashboard/despachos/EditarDespachoPage';
import { NuevoDespachoPage } from '@/pages/dashboard/despachos/NuevoDespachoPage';
import { LoteRecepcionListPage } from '@/pages/dashboard/lotes-recepcion/LoteRecepcionListPage';
import { LoteRecepcionNuevoPage } from '@/pages/dashboard/lotes-recepcion/LoteRecepcionNuevoPage';
import { LoteRecepcionDetailPage } from '@/pages/dashboard/lotes-recepcion/LoteRecepcionDetailPage';
import { AgenciaListPage } from '@/pages/dashboard/agencias/AgenciaListPage';
import { AgenciaDistribuidorListPage } from '@/pages/dashboard/agencias-distribuidor/AgenciaDistribuidorListPage';
import { DistribuidorListPage } from '@/pages/dashboard/distribuidores/DistribuidorListPage';
import { ManifiestoListPage } from '@/pages/dashboard/manifiestos/ManifiestoListPage';
import { ManifiestoDetailPage } from '@/pages/dashboard/manifiestos/ManifiestoDetailPage';
import { TrackingPage } from '@/pages/tracking/TrackingPage';
import { CalculadoraPage } from '@/pages/calculadora/CalculadoraPage';
import { TarifaCalculadoraPage } from '@/pages/dashboard/tarifa-calculadora/TarifaCalculadoraPage';
import { ParametrosSistemaPage } from '@/pages/dashboard/parametros-sistema/ParametrosSistemaPage';
import { AgenciaEeuuPage } from '@/pages/dashboard/agencia-eeuu/AgenciaEeuuPage';
import { PerfilPage } from '@/pages/perfil/PerfilPage';
import { useAuthStore } from '@/stores/authStore';
import { applyTheme, useThemeStore } from '@/stores/themeStore';

function RootLayout() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <>
      <Outlet />
      <AppToaster />
    </>
  );
}

function requireAuth() {
  const token = useAuthStore.getState().token;
  if (!token) throw redirect({ to: '/login' });
}

function requirePermission(permission: string) {
  return () => {
    requireAuth();
    const { hasPermission } = useAuthStore.getState();
    if (!hasPermission(permission)) throw redirect({ to: '/inicio' });
  };
}

function withDashboardLayout<P extends object>(Component: ComponentType<P>) {
  return function DashboardLayoutWrapper(props: P) {
    return (
      <DashboardLayout>
        <Component {...props} />
      </DashboardLayout>
    );
  };
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const registroRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/registro',
  component: RegistroSimplePage,
});

const registroRapidoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/registro/rapido',
  beforeLoad: () => {
    throw redirect({ to: '/registro' });
  },
  component: RegistroSimplePage,
});

const registroCompletoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/registro/completo',
  beforeLoad: () => {
    throw redirect({ to: '/registro' });
  },
  component: RegistroSimplePage,
});

const trackingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tracking',
  component: TrackingPage,
});

const calculadoraRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calculadora',
  component: CalculadoraPage,
});

// Panel routes (flat, with layout wrapper + auth)
const inicioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inicio',
  beforeLoad: requireAuth,
  component: withDashboardLayout(DashboardPage),
});

const agenciaEeuuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agencia-eeuu',
  beforeLoad: requireAuth,
  component: withDashboardLayout(AgenciaEeuuPage),
});

const perfilRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil',
  beforeLoad: requireAuth,
  component: withDashboardLayout(PerfilPage),
});

const usuariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/usuarios',
  beforeLoad: requirePermission('USUARIOS_READ'),
  component: withDashboardLayout(UsuarioList),
});

const rolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/roles',
  beforeLoad: requirePermission('ROLES_READ'),
  component: withDashboardLayout(RolList),
});

const permisosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/permisos',
  beforeLoad: requirePermission('PERMISOS_READ'),
  component: withDashboardLayout(PermisoList),
});

const destinatariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/destinatarios',
  beforeLoad: requirePermission('DESTINATARIOS_READ'),
  component: withDashboardLayout(DestinatarioListPage),
});

const paquetesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/paquetes',
  beforeLoad: requirePermission('PAQUETES_READ'),
  component: withDashboardLayout(PaqueteListPage),
});

const paquetesVencidosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/paquetes-vencidos',
  beforeLoad: requirePermission('PAQUETES_PESO_WRITE'),
  component: withDashboardLayout(PaquetesVencidosPage),
});

const cargarPesosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cargar-pesos',
  beforeLoad: requirePermission('PAQUETES_PESO_WRITE'),
  component: withDashboardLayout(CargarPesosPage),
});

const guiasMasterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/guias-master',
  beforeLoad: requirePermission('GUIAS_MASTER_READ'),
  component: withDashboardLayout(GuiasMasterPage),
});

const guiasMasterDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/guias-master/$id',
  beforeLoad: requirePermission('GUIAS_MASTER_READ'),
  component: withDashboardLayout(GuiaMasterDetailPage),
});

const misGuiasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mis-guias',
  beforeLoad: requirePermission('MIS_GUIAS_READ'),
  component: withDashboardLayout(MisGuiasListPage),
});

const misGuiasDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mis-guias/$id',
  beforeLoad: requirePermission('MIS_GUIAS_READ'),
  component: withDashboardLayout(MiGuiaDetailPage),
});

const enviosConsolidadosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/envios-consolidados',
  beforeLoad: requirePermission('ENVIOS_CONSOLIDADOS_READ'),
  component: withDashboardLayout(EnviosConsolidadosListPage),
});

const enviosConsolidadosDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/envios-consolidados/$id',
  beforeLoad: requirePermission('ENVIOS_CONSOLIDADOS_READ'),
  component: withDashboardLayout(EnvioConsolidadoDetailPage),
});

const gestionarEstadosPaquetesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gestionar-estados-paquetes',
  beforeLoad: requirePermission('PAQUETES_PESO_WRITE'),
  component: withDashboardLayout(GestionarEstadosPaquetesPage),
});

const despachosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/despachos',
  beforeLoad: requirePermission('DESPACHOS_WRITE'),
  component: withDashboardLayout(DespachoListPage),
});

const despachosNuevoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/despachos/nuevo',
  beforeLoad: requirePermission('DESPACHOS_WRITE'),
  component: withDashboardLayout(NuevoDespachoPage),
});

const despachosDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/despachos/$id',
  beforeLoad: requirePermission('DESPACHOS_WRITE'),
  component: withDashboardLayout(DespachoDetailPage),
});

const despachosEditarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/despachos/$id/editar',
  beforeLoad: requirePermission('DESPACHOS_WRITE'),
  component: withDashboardLayout(EditarDespachoPage),
});

const lotesRecepcionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lotes-recepcion',
  beforeLoad: requirePermission('DESPACHOS_WRITE'),
  component: withDashboardLayout(LoteRecepcionListPage),
});

const lotesRecepcionNuevoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lotes-recepcion/nuevo',
  beforeLoad: requirePermission('DESPACHOS_WRITE'),
  component: withDashboardLayout(LoteRecepcionNuevoPage),
});

const lotesRecepcionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lotes-recepcion/$id',
  beforeLoad: requirePermission('DESPACHOS_WRITE'),
  component: withDashboardLayout(LoteRecepcionDetailPage),
});

const agenciasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agencias',
  beforeLoad: requirePermission('AGENCIAS_READ'),
  component: withDashboardLayout(AgenciaListPage),
});

const agenciasDistribuidorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agencias-distribuidor',
  beforeLoad: requirePermission('AGENCIAS_DISTRIBUIDOR_READ'),
  component: withDashboardLayout(AgenciaDistribuidorListPage),
});

const distribuidoresRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/distribuidores',
  beforeLoad: requirePermission('DISTRIBUIDORES_READ'),
  component: withDashboardLayout(DistribuidorListPage),
});

const manifiestosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manifiestos',
  beforeLoad: requirePermission('MANIFIESTOS_READ'),
  component: withDashboardLayout(ManifiestoListPage),
});

const manifiestosDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manifiestos/$id',
  beforeLoad: requirePermission('MANIFIESTOS_READ'),
  component: withDashboardLayout(ManifiestoDetailPage),
});

const tarifaCalculadoraRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tarifa-calculadora',
  beforeLoad: requirePermission('DESPACHOS_WRITE'),
  component: withDashboardLayout(TarifaCalculadoraPage),
});

const parametrosSistemaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/parametros-sistema',
  beforeLoad: requirePermission('DESPACHOS_WRITE'),
  component: withDashboardLayout(ParametrosSistemaPage),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registroRoute,
  registroRapidoRoute,
  registroCompletoRoute,
  trackingRoute,
  calculadoraRoute,
  inicioRoute,
  agenciaEeuuRoute,
  perfilRoute,
  usuariosRoute,
  rolesRoute,
  permisosRoute,
  destinatariosRoute,
  paquetesRoute,
  paquetesVencidosRoute,
  cargarPesosRoute,
  guiasMasterRoute,
  guiasMasterDetailRoute,
  misGuiasRoute,
  misGuiasDetailRoute,
  enviosConsolidadosRoute,
  enviosConsolidadosDetailRoute,
  gestionarEstadosPaquetesRoute,
  despachosRoute,
  despachosNuevoRoute,
  despachosDetailRoute,
  despachosEditarRoute,
  lotesRecepcionRoute,
  lotesRecepcionNuevoRoute,
  lotesRecepcionDetailRoute,
  agenciasRoute,
  agenciasDistribuidorRoute,
  distribuidoresRoute,
  manifiestosRoute,
  manifiestosDetailRoute,
  tarifaCalculadoraRoute,
  parametrosSistemaRoute,
]);
const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
