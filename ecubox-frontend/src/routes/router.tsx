import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  redirect,
  HeadContent,
} from '@tanstack/react-router';
import { createPortal } from 'react-dom';
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
import { ConsignatarioListPage } from '@/pages/dashboard/consignatarios/ConsignatarioListPage';
import { PaqueteListPage } from '@/pages/dashboard/paquetes/PaqueteListPage';
import { PaquetesVencidosPage } from '@/pages/dashboard/paquetes/PaquetesVencidosPage';
import { PesajePage } from '@/pages/dashboard/pesaje/PesajePage';
import { GuiasMasterPage } from '@/pages/dashboard/guias-master/GuiasMasterPage';
import { GuiaMasterDetailPage } from '@/pages/dashboard/guias-master/GuiaMasterDetailPage';
import { MisGuiasListPage } from '@/pages/dashboard/mis-guias/MisGuiasListPage';
import { MiGuiaDetailPage } from '@/pages/dashboard/mis-guias/MiGuiaDetailPage';
import { EnviosConsolidadosListPage } from '@/pages/dashboard/envios-consolidados/EnviosConsolidadosListPage';
import { EnvioConsolidadoDetailPage } from '@/pages/dashboard/envios-consolidados/EnvioConsolidadoDetailPage';
import { LiquidacionesListPage } from '@/pages/dashboard/liquidaciones/LiquidacionesListPage';
import { LiquidacionDetailPage } from '@/pages/dashboard/liquidaciones/LiquidacionDetailPage';
import { GestionarEstadosPaquetesPage } from '@/pages/dashboard/gestionar-estados-paquetes/GestionarEstadosPaquetesPage';
import { DespachoListPage } from '@/pages/dashboard/despachos/DespachoListPage';
import { DespachoDetailPage } from '@/pages/dashboard/despachos/DespachoDetailPage';
import { EditarDespachoPage } from '@/pages/dashboard/despachos/EditarDespachoPage';
import { NuevoDespachoPage } from '@/pages/dashboard/despachos/NuevoDespachoPage';
import { LoteRecepcionListPage } from '@/pages/dashboard/lotes-recepcion/LoteRecepcionListPage';
import { LoteRecepcionNuevoPage } from '@/pages/dashboard/lotes-recepcion/LoteRecepcionNuevoPage';
import { LoteRecepcionDetailPage } from '@/pages/dashboard/lotes-recepcion/LoteRecepcionDetailPage';
import { AgenciaListPage } from '@/pages/dashboard/agencias/AgenciaListPage';
import { PuntoEntregaListPage } from '@/pages/dashboard/puntos-entrega/PuntoEntregaListPage';
import { CourierEntregaListPage } from '@/pages/dashboard/couriers-entrega/CourierEntregaListPage';
import { ManifiestoListPage } from '@/pages/dashboard/manifiestos/ManifiestoListPage';
import { ManifiestoDetailPage } from '@/pages/dashboard/manifiestos/ManifiestoDetailPage';
import { TrackingPage } from '@/pages/tracking/TrackingPage';
import { CalculadoraPage } from '@/pages/calculadora/CalculadoraPage';
import { TarifaCalculadoraPage } from '@/pages/dashboard/tarifa-calculadora/TarifaCalculadoraPage';
import { ParametrosSistemaPage } from '@/pages/dashboard/parametros-sistema/ParametrosSistemaPage';
import { CasilleroPage } from '@/pages/dashboard/casillero/CasilleroPage';
import { PerfilPage } from '@/pages/perfil/PerfilPage';
import { useAuthStore } from '@/stores/authStore';
import { applyTheme, useThemeStore } from '@/stores/themeStore';
import {
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_TITLE,
  buildHomeJsonLd,
  buildPublicPageHead,
} from '@/lib/seo';

function RootLayout() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <>
      {typeof document !== 'undefined' &&
        createPortal(<HeadContent />, document.head)}
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

/** Los tipos de `head` en createRoute exigen JSX Meta; en runtime TanStack acepta MetaDescriptor (p. ej. script:ld+json). */
type RouteHeadResult = {
  meta: Array<Record<string, unknown>>;
  links?: Array<Record<string, string>>;
};

const rootRoute = createRootRoute({
  component: RootLayout,
  head: () =>
    ({
      meta: [
        { title: SEO_DEFAULT_TITLE },
        { name: 'description', content: SEO_DEFAULT_DESCRIPTION },
      ],
      links: [],
    }) as RouteHeadResult,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
  head: () => {
    const { meta, links } = buildPublicPageHead({
      title: 'ECUBOX | Casillero en USA y envíos a Ecuador con rastreo',
      description:
        'Casillero en New Jersey sin mensualidad, envíos a Ecuador en 8-12 días laborables, rastreo por pieza y calculadora de tarifas. ECUBOX lleva tus compras de USA a casa.',
      path: '/',
    });
    const jsonLd = buildHomeJsonLd();
    return {
      meta: [...meta, ...jsonLd],
      links,
    } as RouteHeadResult;
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  head: () =>
    buildPublicPageHead({
      title: 'Iniciar sesión | ECUBOX',
      description:
        'Accede a tu cuenta ECUBOX para gestionar tu casillero, envíos, rastreo y datos de contacto de forma segura.',
      path: '/login',
    }) as RouteHeadResult,
});

const registroRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/registro',
  component: RegistroSimplePage,
  head: () =>
    buildPublicPageHead({
      title: 'Crear cuenta y casillero gratis | ECUBOX',
      description:
        'Regístrate gratis en ECUBOX y obtén tu dirección en USA para compras online. Sin tarjeta ni mensualidad: solo pagas los envíos que uses.',
      path: '/registro',
    }) as RouteHeadResult,
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
  head: () =>
    buildPublicPageHead({
      title: 'Rastreo de paquetes y guías | ECUBOX',
      description:
        'Consulta el estado de tu envío con el número de guía o código del consolidador. ECUBOX muestra el seguimiento por pieza en tiempo real.',
      path: '/tracking',
    }) as RouteHeadResult,
});

const calculadoraRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calculadora',
  component: CalculadoraPage,
  head: () =>
    buildPublicPageHead({
      title: 'Calculadora de tarifas de envío USA–Ecuador | ECUBOX',
      description:
        'Cotiza el costo aproximado de tu envío desde Estados Unidos a Ecuador según peso y servicio. Sin sorpresas antes de comprar en tiendas online.',
      path: '/calculadora',
    }) as RouteHeadResult,
});

// Panel routes (flat, with layout wrapper + auth)
const inicioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inicio',
  beforeLoad: requireAuth,
  component: withDashboardLayout(DashboardPage),
});

const casilleroRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/casillero',
  beforeLoad: requireAuth,
  component: withDashboardLayout(CasilleroPage),
});

const agenciaEeuuLegacyRedirect = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agencia-eeuu',
  beforeLoad: () => {
    throw redirect({ to: '/casillero' });
  },
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

const consignatariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/consignatarios',
  beforeLoad: requirePermission('CONSIGNATARIOS_READ'),
  component: withDashboardLayout(ConsignatarioListPage),
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

const pesajeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pesaje',
  beforeLoad: requirePermission('PAQUETES_PESO_WRITE'),
  component: withDashboardLayout(PesajePage),
});

const cargarPesosLegacyRedirect = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cargar-pesos',
  beforeLoad: () => {
    throw redirect({ to: '/pesaje' });
  },
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

const liquidacionesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/liquidaciones',
  beforeLoad: requirePermission('LIQUIDACION_CONSOLIDADO_READ'),
  component: withDashboardLayout(LiquidacionesListPage),
});

const liquidacionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/liquidaciones/$id',
  beforeLoad: requirePermission('LIQUIDACION_CONSOLIDADO_READ'),
  component: withDashboardLayout(LiquidacionDetailPage),
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

const puntosEntregaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/puntos-entrega',
  beforeLoad: requirePermission('PUNTOS_ENTREGA_READ'),
  component: withDashboardLayout(PuntoEntregaListPage),
});

const couriersEntregaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/couriers-entrega',
  beforeLoad: requirePermission('COURIERS_ENTREGA_READ'),
  component: withDashboardLayout(CourierEntregaListPage),
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
  casilleroRoute,
  agenciaEeuuLegacyRedirect,
  perfilRoute,
  usuariosRoute,
  rolesRoute,
  permisosRoute,
  consignatariosRoute,
  paquetesRoute,
  paquetesVencidosRoute,
  pesajeRoute,
  cargarPesosLegacyRedirect,
  guiasMasterRoute,
  guiasMasterDetailRoute,
  misGuiasRoute,
  misGuiasDetailRoute,
  enviosConsolidadosRoute,
  enviosConsolidadosDetailRoute,
  liquidacionesRoute,
  liquidacionDetailRoute,
  gestionarEstadosPaquetesRoute,
  despachosRoute,
  despachosNuevoRoute,
  despachosDetailRoute,
  despachosEditarRoute,
  lotesRecepcionRoute,
  lotesRecepcionNuevoRoute,
  lotesRecepcionDetailRoute,
  agenciasRoute,
  puntosEntregaRoute,
  couriersEntregaRoute,
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
