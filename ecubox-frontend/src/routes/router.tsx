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
import { lazy, Suspense, useEffect, type ComponentType, type ElementType } from 'react';
import { AppToaster } from '@/components/ui/sonner';
import { RouteErrorScreen } from '@/components/RouteErrorScreen';
import { reloadOnce } from '@/lib/chunkRecovery';
import { useAuthStore } from '@/stores/authStore';
import { applyTheme, useThemeStore } from '@/stores/themeStore';
import {
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_TITLE,
  buildHomeJsonLd,
  buildPublicPageHead,
} from '@/lib/seo';

const HomePage = lazyNamed(() => import('@/pages/home/HomePage'), 'HomePage');
const LoginPage = lazyNamed(() => import('@/pages/login/LoginPage'), 'LoginPage');
const RegistroSimplePage = lazyNamed(
  () => import('@/pages/registro/RegistroSimplePage'),
  'RegistroSimplePage',
);
const TerminosCondicionesPage = lazyNamed(
  () => import('@/pages/legal/TerminosCondicionesPage'),
  'TerminosCondicionesPage',
);
const PoliticaPrivacidadPage = lazyNamed(
  () => import('@/pages/legal/PoliticaPrivacidadPage'),
  'PoliticaPrivacidadPage',
);
const DashboardLayout = lazyNamed(
  () => import('@/pages/dashboard/DashboardLayout'),
  'DashboardLayout',
);
const DashboardPage = lazyNamed(() => import('@/pages/dashboard/DashboardPage'), 'DashboardPage');
const EstadisticasPage = lazyNamed(
  () => import('@/pages/dashboard/estadisticas/EstadisticasPage'),
  'EstadisticasPage',
);
const UsuarioList = lazyNamed(() => import('@/pages/dashboard/usuarios/UsuarioList'), 'UsuarioList');
const RolList = lazyNamed(() => import('@/pages/dashboard/roles/RolList'), 'RolList');
const PermisoList = lazyNamed(() => import('@/pages/dashboard/permisos/PermisoList'), 'PermisoList');
const ConsignatarioListPage = lazyNamed(
  () => import('@/pages/dashboard/consignatarios/ConsignatarioListPage'),
  'ConsignatarioListPage',
);
const PaqueteListPage = lazyNamed(
  () => import('@/pages/dashboard/paquetes/PaqueteListPage'),
  'PaqueteListPage',
);
const PaquetesVencidosPage = lazyNamed(
  () => import('@/pages/dashboard/paquetes/PaquetesVencidosPage'),
  'PaquetesVencidosPage',
);
const PesajePage = lazyNamed(() => import('@/pages/dashboard/pesaje/PesajePage'), 'PesajePage');
const GuiasMasterPage = lazyNamed(
  () => import('@/pages/dashboard/guias-master/GuiasMasterPage'),
  'GuiasMasterPage',
);
const GuiaMasterDetailPage = lazyNamed(
  () => import('@/pages/dashboard/guias-master/GuiaMasterDetailPage'),
  'GuiaMasterDetailPage',
);
const MisGuiasListPage = lazyNamed(
  () => import('@/pages/dashboard/mis-guias/MisGuiasListPage'),
  'MisGuiasListPage',
);
const MisEntregasPage = lazyNamed(
  () => import('@/pages/dashboard/mis-entregas/MisEntregasPage'),
  'MisEntregasPage',
);
const MiDespachoDetallePage = lazyNamed(
  () => import('@/pages/dashboard/mis-entregas/MiDespachoDetallePage'),
  'MiDespachoDetallePage',
);
const MiGuiaDetailPage = lazyNamed(
  () => import('@/pages/dashboard/mis-guias/MiGuiaDetailPage'),
  'MiGuiaDetailPage',
);
const EnviosConsolidadosListPage = lazyNamed(
  () => import('@/pages/dashboard/envios-consolidados/EnviosConsolidadosListPage'),
  'EnviosConsolidadosListPage',
);
const EnvioConsolidadoDetailPage = lazyNamed(
  () => import('@/pages/dashboard/envios-consolidados/EnvioConsolidadoDetailPage'),
  'EnvioConsolidadoDetailPage',
);
const LiquidacionesListPage = lazyNamed(
  () => import('@/pages/dashboard/liquidaciones/LiquidacionesListPage'),
  'LiquidacionesListPage',
);
const LiquidacionDetailPage = lazyNamed(
  () => import('@/pages/dashboard/liquidaciones/LiquidacionDetailPage'),
  'LiquidacionDetailPage',
);
const DespachoListPage = lazyNamed(
  () => import('@/pages/dashboard/despachos/DespachoListPage'),
  'DespachoListPage',
);
const DespachoDetailPage = lazyNamed(
  () => import('@/pages/dashboard/despachos/DespachoDetailPage'),
  'DespachoDetailPage',
);
const EditarDespachoPage = lazyNamed(
  () => import('@/pages/dashboard/despachos/EditarDespachoPage'),
  'EditarDespachoPage',
);
const NuevoDespachoPage = lazyNamed(
  () => import('@/pages/dashboard/despachos/NuevoDespachoPage'),
  'NuevoDespachoPage',
);
const LoteRecepcionListPage = lazyNamed(
  () => import('@/pages/dashboard/lotes-recepcion/LoteRecepcionListPage'),
  'LoteRecepcionListPage',
);
const LoteRecepcionNuevoPage = lazyNamed(
  () => import('@/pages/dashboard/lotes-recepcion/LoteRecepcionNuevoPage'),
  'LoteRecepcionNuevoPage',
);
const LoteRecepcionDetailPage = lazyNamed(
  () => import('@/pages/dashboard/lotes-recepcion/LoteRecepcionDetailPage'),
  'LoteRecepcionDetailPage',
);
const AgenciaListPage = lazyNamed(
  () => import('@/pages/dashboard/agencias/AgenciaListPage'),
  'AgenciaListPage',
);
const PuntoEntregaListPage = lazyNamed(
  () => import('@/pages/dashboard/puntos-entrega/PuntoEntregaListPage'),
  'PuntoEntregaListPage',
);
const CourierEntregaListPage = lazyNamed(
  () => import('@/pages/dashboard/couriers-entrega/CourierEntregaListPage'),
  'CourierEntregaListPage',
);
const ManifiestoListPage = lazyNamed(
  () => import('@/pages/dashboard/manifiestos/ManifiestoListPage'),
  'ManifiestoListPage',
);
const ManifiestoDetailPage = lazyNamed(
  () => import('@/pages/dashboard/manifiestos/ManifiestoDetailPage'),
  'ManifiestoDetailPage',
);
const TrackingPage = lazyNamed(() => import('@/pages/tracking/TrackingPage'), 'TrackingPage');
const TrackingSamplePage = lazyNamed(
  () => import('@/pages/tracking/TrackingSamplePage'),
  'TrackingSamplePage',
);
const CalculadoraPage = lazyNamed(
  () => import('@/pages/calculadora/CalculadoraPage'),
  'CalculadoraPage',
);
const EnlacesPage = lazyNamed(() => import('@/pages/enlaces/EnlacesPage'), 'EnlacesPage');
const AccesoPage = lazyNamed(() => import('@/pages/acceso/AccesoPage'), 'AccesoPage');
const EnlacesAccesoPage = lazyNamed(
  () => import('@/pages/dashboard/enlaces-acceso/EnlacesAccesoPage'),
  'EnlacesAccesoPage',
);
const TarifaCalculadoraPage = lazyNamed(
  () => import('@/pages/dashboard/tarifa-calculadora/TarifaCalculadoraPage'),
  'TarifaCalculadoraPage',
);
const ParametrosSistemaPage = lazyNamed(
  () => import('@/pages/dashboard/parametros-sistema/ParametrosSistemaPage'),
  'ParametrosSistemaPage',
);
const CasilleroPage = lazyNamed(
  () => import('@/pages/dashboard/casillero/CasilleroPage'),
  'CasilleroPage',
);
const PerfilPage = lazyNamed(() => import('@/pages/perfil/PerfilPage'), 'PerfilPage');

function lazyNamed<T extends ComponentType<object>>(loader: () => Promise<unknown>, exportName: string) {
  return lazy(async () => {
    const mod = (await loader()) as Record<string, T> | undefined;
    const component = mod?.[exportName];
    if (!component) {
      // El chunk se descargo pero el export esperado no esta disponible: suele
      // pasar con un index.html obsoleto tras un deploy o un chunk corrupto.
      // Recargamos una vez para traer el bundle nuevo en lugar de romper la ruta
      // con un TypeError de pantalla en blanco.
      reloadOnce();
      throw new Error(`Modulo diferido sin export "${exportName}"; recargando.`);
    }
    return { default: component };
  });
}

function RouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-sm text-muted-foreground">
      Cargando...
    </div>
  );
}

function RootLayout() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <>
      {typeof document !== 'undefined' &&
        createPortal(<HeadContent />, document.head)}
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
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
    const { hasPermission, isAcceso } = useAuthStore.getState();
    if (!hasPermission(permission)) throw redirect({ to: isAcceso ? '/mis-guias' : '/inicio' });
  };
}

function requireAnyPermission(permissions: string[]) {
  return () => {
    requireAuth();
    const { hasPermission, isAcceso } = useAuthStore.getState();
    if (!permissions.some((permission) => hasPermission(permission))) {
      throw redirect({ to: isAcceso ? '/mis-guias' : '/inicio' });
    }
  };
}

function withDashboardLayout(Component: ElementType) {
  return function DashboardLayoutWrapper(props: Record<string, unknown>) {
    const PageComponent = Component;
    return (
      <DashboardLayout>
        <PageComponent {...props} />
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
        'Consulta el estado de tu envío con el número de guía o código del consolidador. ECUBOX muestra el rastreo por pieza en tiempo real.',
      path: '/tracking',
    }) as RouteHeadResult,
});

const trackingEjemploRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tracking/ejemplo',
  component: TrackingSamplePage,
  head: () =>
    buildPublicPageHead({
      title: 'Ejemplos de rastreo (demostración) | ECUBOX',
      description:
        'Explora guías de muestra para ver cómo funciona el rastreo público de ECUBOX. Datos ficticios solo con fines demostrativos.',
      path: '/tracking/ejemplo',
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

const accesoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/acceso',
  component: AccesoPage,
  head: () =>
    buildPublicPageHead({
      title: 'Acceso a tus paquetes | ECUBOX',
      description:
        'Abre tu enlace de acceso ECUBOX para consultar tus paquetes y consignatarios sin necesidad de registrarte.',
      path: '/acceso',
    }) as RouteHeadResult,
});

const enlacesAccesoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/enlaces-acceso',
  beforeLoad: requirePermission('ACCESO_ENLACES_MANAGE'),
  component: withDashboardLayout(EnlacesAccesoPage),
});

const enlacesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/enlaces',
  component: EnlacesPage,
  head: () =>
    buildPublicPageHead({
      title: 'Enlaces y contacto | ECUBOX',
      description:
        'Todos los enlaces de ECUBOX en un solo lugar: rastreo, calculadora de tarifas, registro, contacto y redes sociales oficiales. Escanea el QR para compartir.',
      path: '/enlaces',
    }) as RouteHeadResult,
});

const terminosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terminos',
  component: TerminosCondicionesPage,
  head: () =>
    buildPublicPageHead({
      title: 'Términos y condiciones | ECUBOX',
      description:
        'Condiciones de uso del casillero en USA, envíos a Ecuador, rastreo y servicios digitales ECUBOX. Aplicable al registro y a la relación con clientes.',
      path: '/terminos',
    }) as RouteHeadResult,
});

const privacidadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacidad',
  component: PoliticaPrivacidadPage,
  head: () =>
    buildPublicPageHead({
      title: 'Política de privacidad | ECUBOX',
      description:
        'Cómo ECUBOX trata tus datos personales: cuenta, operación logística, derechos ARCO y seguridad, conforme a la normativa ecuatoriana.',
      path: '/privacidad',
    }) as RouteHeadResult,
});

// Panel routes (flat, with layout wrapper + auth)
const inicioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inicio',
  beforeLoad: requirePermission('INICIO_READ'),
  component: withDashboardLayout(DashboardPage),
});

const estadisticasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/estadisticas',
  beforeLoad: requirePermission('ESTADISTICAS_READ'),
  component: withDashboardLayout(EstadisticasPage),
});

const casilleroRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/casillero',
  beforeLoad: requirePermission('CASILLERO_READ'),
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
  beforeLoad: requirePermission('PERFIL_READ'),
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
  beforeLoad: requireAnyPermission(['CONSIGNATARIOS_READ', 'ACCESO_ENLACE_CONSIGNATARIOS_READ']),
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
  beforeLoad: requireAnyPermission(['MIS_GUIAS_READ', 'ACCESO_ENLACE_GUIAS_READ']),
  component: withDashboardLayout(MisGuiasListPage),
});

const misGuiasDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mis-guias/$id',
  beforeLoad: requireAnyPermission(['MIS_GUIAS_READ', 'ACCESO_ENLACE_GUIAS_READ']),
  component: withDashboardLayout(MiGuiaDetailPage),
});

const misEntregasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mis-entregas',
  beforeLoad: requireAnyPermission(['MIS_ENTREGAS_READ', 'ACCESO_ENLACE_MIS_ENTREGAS_READ']),
  component: withDashboardLayout(MisEntregasPage),
});

const miDespachoDetalleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mis-entregas/$id',
  beforeLoad: requireAnyPermission(['MIS_ENTREGAS_READ', 'ACCESO_ENLACE_MIS_ENTREGAS_READ']),
  component: withDashboardLayout(MiDespachoDetallePage),
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
  beforeLoad: requirePermission('LOTES_RECEPCION_READ'),
  component: withDashboardLayout(LoteRecepcionListPage),
});

const lotesRecepcionNuevoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lotes-recepcion/nuevo',
  beforeLoad: requirePermission('LOTES_RECEPCION_CREATE'),
  component: withDashboardLayout(LoteRecepcionNuevoPage),
});

const lotesRecepcionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lotes-recepcion/$id',
  beforeLoad: requirePermission('LOTES_RECEPCION_READ'),
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
  beforeLoad: requirePermission('TARIFA_CALCULADORA_READ'),
  component: withDashboardLayout(TarifaCalculadoraPage),
});

const parametrosSistemaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/parametros-sistema',
  beforeLoad: requirePermission('PARAMETROS_SISTEMA_READ'),
  component: withDashboardLayout(ParametrosSistemaPage),
});

const parametrosSistemaSeccionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/parametros-sistema/$seccion',
  beforeLoad: requirePermission('PARAMETROS_SISTEMA_READ'),
  component: withDashboardLayout(ParametrosSistemaPage),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registroRoute,
  registroRapidoRoute,
  registroCompletoRoute,
  trackingRoute,
  trackingEjemploRoute,
  calculadoraRoute,
  accesoRoute,
  enlacesAccesoRoute,
  enlacesRoute,
  terminosRoute,
  privacidadRoute,
  inicioRoute,
  estadisticasRoute,
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
  misEntregasRoute,
  miDespachoDetalleRoute,
  enviosConsolidadosRoute,
  enviosConsolidadosDetailRoute,
  liquidacionesRoute,
  liquidacionDetailRoute,
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
  parametrosSistemaSeccionRoute,
]);
const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ error }) => <RouteErrorScreen error={error} />,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
