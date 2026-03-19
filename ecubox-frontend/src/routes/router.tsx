import { createRootRoute, createRoute, createRouter, RouterProvider, Outlet, redirect } from '@tanstack/react-router';
import type { ComponentType } from 'react';
import { Toaster } from 'sonner';
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
import { CargarPesosPage } from '@/pages/dashboard/cargar-pesos/CargarPesosPage';
import { AsignarGuiaEnvioPage } from '@/pages/dashboard/asignar-guia-envio/AsignarGuiaEnvioPage';
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
import { useAuthStore } from '@/stores/authStore';

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster position="top-right" richColors />
    </>
  );
}

function requireAuth() {
  const token = useAuthStore.getState().token;
  if (!token) throw redirect({ to: '/login' });
}

function requireAdminOrOperario() {
  requireAuth();
  const { roles } = useAuthStore.getState();
  const allowed = roles.includes('ADMIN') || roles.includes('OPERARIO');
  if (!allowed) throw redirect({ to: '/inicio' });
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

const usuariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/usuarios',
  beforeLoad: requireAuth,
  component: withDashboardLayout(UsuarioList),
});

const rolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/roles',
  beforeLoad: requireAuth,
  component: withDashboardLayout(RolList),
});

const permisosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/permisos',
  beforeLoad: requireAuth,
  component: withDashboardLayout(PermisoList),
});

const destinatariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/destinatarios',
  beforeLoad: requireAuth,
  component: withDashboardLayout(DestinatarioListPage),
});

const paquetesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/paquetes',
  beforeLoad: requireAuth,
  component: withDashboardLayout(PaqueteListPage),
});

const cargarPesosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cargar-pesos',
  beforeLoad: requireAuth,
  component: withDashboardLayout(CargarPesosPage),
});

const asignarGuiaEnvioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/asignar-guia-envio',
  beforeLoad: requireAdminOrOperario,
  component: withDashboardLayout(AsignarGuiaEnvioPage),
});

const gestionarEstadosPaquetesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gestionar-estados-paquetes',
  beforeLoad: requireAuth,
  component: withDashboardLayout(GestionarEstadosPaquetesPage),
});

const despachosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/despachos',
  beforeLoad: requireAuth,
  component: withDashboardLayout(DespachoListPage),
});

const despachosNuevoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/despachos/nuevo',
  beforeLoad: requireAuth,
  component: withDashboardLayout(NuevoDespachoPage),
});

const despachosDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/despachos/$id',
  beforeLoad: requireAuth,
  component: withDashboardLayout(DespachoDetailPage),
});

const despachosEditarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/despachos/$id/editar',
  beforeLoad: requireAuth,
  component: withDashboardLayout(EditarDespachoPage),
});

const lotesRecepcionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lotes-recepcion',
  beforeLoad: requireAuth,
  component: withDashboardLayout(LoteRecepcionListPage),
});

const lotesRecepcionNuevoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lotes-recepcion/nuevo',
  beforeLoad: requireAuth,
  component: withDashboardLayout(LoteRecepcionNuevoPage),
});

const lotesRecepcionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lotes-recepcion/$id',
  beforeLoad: requireAuth,
  component: withDashboardLayout(LoteRecepcionDetailPage),
});

const agenciasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agencias',
  beforeLoad: requireAuth,
  component: withDashboardLayout(AgenciaListPage),
});

const agenciasDistribuidorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agencias-distribuidor',
  beforeLoad: requireAuth,
  component: withDashboardLayout(AgenciaDistribuidorListPage),
});

const distribuidoresRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/distribuidores',
  beforeLoad: requireAuth,
  component: withDashboardLayout(DistribuidorListPage),
});

const manifiestosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manifiestos',
  beforeLoad: requireAuth,
  component: withDashboardLayout(ManifiestoListPage),
});

const manifiestosDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manifiestos/$id',
  beforeLoad: requireAuth,
  component: withDashboardLayout(ManifiestoDetailPage),
});

const tarifaCalculadoraRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tarifa-calculadora',
  beforeLoad: requireAuth,
  component: withDashboardLayout(TarifaCalculadoraPage),
});

const parametrosSistemaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/parametros-sistema',
  beforeLoad: requireAuth,
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
  usuariosRoute,
  rolesRoute,
  permisosRoute,
  destinatariosRoute,
  paquetesRoute,
  cargarPesosRoute,
  asignarGuiaEnvioRoute,
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
