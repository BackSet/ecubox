import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Users,
  Shield,
  Key,
  MapPin,
  Package,
  Weight,
  Truck,
  Building2,
  PackageCheck,
  ClipboardList,
  FileText,
  Settings,
  AlertTriangle,
  Boxes,
  Plane,
  Contact,
  Wallet,
  ChartNoAxesCombined,
  Link2,
  MessageCircle,
  Share2,
  Sparkles,
  Calculator,
  ListOrdered,
  PlugZap,
} from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  permission?: string;
  permissionsAny?: string[];
  keywords?: string[];
  children?: NavItem[];
  /**
   * Resuelve la etiqueta visible según la audiencia (permisos del usuario), sin
   * duplicar la ruta. Si se define, su resultado reemplaza a {@link label}.
   * Se usa para mostrar "Consignatarios" al back-office y "Destinatarios" al
   * cliente sobre la misma ruta `/consignatarios`.
   */
  labelFor?: (hasPermission: (permission: string) => boolean) => string;
};

/**
 * Subopciones de "Parámetros del sistema", mostradas como subgrupo en el
 * sidebar. Cada una corresponde a una sección de {@link ParametrosSistemaPage}
 * accesible vía `/parametros-sistema/<slug>`.
 */
const PARAMETROS_SISTEMA_SECCIONES: NavItem[] = [
  {
    to: '/parametros-sistema/whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    permission: 'MENSAJE_WHATSAPP_DESPACHO_READ',
  },
  {
    to: '/parametros-sistema/casillero',
    label: 'Casillero',
    icon: MapPin,
    permission: 'MENSAJE_AGENCIA_EEUU_READ',
  },
  {
    to: '/parametros-sistema/contacto',
    label: 'Contacto',
    icon: Share2,
    permission: 'CANALES_COMUNICACION_READ',
  },
  {
    to: '/parametros-sistema/temporada',
    label: 'Temporada',
    icon: Sparkles,
    permission: 'TEMA_TEMPORADA_READ',
  },
  {
    to: '/parametros-sistema/tarifa',
    label: 'Tarifa',
    icon: Calculator,
    permission: 'TARIFA_CALCULADORA_READ',
  },
  {
    to: '/parametros-sistema/distribucion',
    label: 'Distribución',
    icon: Truck,
    permission: 'CONFIG_TARIFA_DISTRIBUCION_READ',
  },
  {
    to: '/parametros-sistema/estados',
    label: 'Estados',
    icon: ListOrdered,
    permission: 'ESTADOS_RASTREO_READ',
  },
  {
    to: '/parametros-sistema/por-punto',
    label: 'Por punto',
    icon: PlugZap,
    permission: 'ESTADOS_RASTREO_READ',
  },
];

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * Catálogo canónico de items de navegación. Cada item se define UNA sola vez
 * (ruta, icono, permiso, keywords) y se referencia desde las composiciones por
 * audiencia. No se duplican rutas, iconos ni permisos entre composiciones.
 *
 * El item `consignatarios` es la misma ruta `/consignatarios` para todas las
 * audiencias; solo cambia el rótulo (Consignatarios/Destinatarios) vía
 * {@link NavItem.labelFor}, sin duplicar la ruta.
 */
const NAV = {
  inicio: {
    to: '/inicio',
    label: 'Inicio',
    icon: LayoutDashboard,
    exact: true,
    permission: 'INICIO_READ',
    keywords: ['dashboard', 'home', 'panel'],
  },
  estadisticas: {
    to: '/estadisticas',
    label: 'Estadísticas',
    icon: ChartNoAxesCombined,
    permission: 'ESTADISTICAS_READ',
    keywords: ['estadisticas', 'graficas', 'indicadores', 'demorados', 'kpi'],
  },
  misGuias: {
    to: '/mis-guias',
    label: 'Mis guías',
    icon: Boxes,
    permission: 'MIS_GUIAS_READ',
    permissionsAny: ['MIS_GUIAS_READ', 'ACCESO_ENLACE_GUIAS_READ'],
    keywords: ['guia', 'tracking', 'envio'],
  },
  misEntregas: {
    to: '/mis-entregas',
    label: 'Mis entregas',
    icon: PackageCheck,
    permission: 'MIS_ENTREGAS_READ',
    permissionsAny: ['MIS_ENTREGAS_READ', 'ACCESO_ENLACE_MIS_ENTREGAS_READ'],
    keywords: ['entrega', 'recibi', 'confirmar', 'despacho', 'envio'],
  },
  casillero: {
    to: '/casillero',
    label: 'Mi casillero',
    icon: MapPin,
    permission: 'CASILLERO_READ',
    keywords: ['casillero', 'agencia', 'usa', 'eeuu', 'direccion', 'mailbox'],
  },
  consignatarios: {
    to: '/consignatarios',
    // Back-office: "Consignatarios"; cliente / sesión por enlace: "Destinatarios".
    // La ruta es la misma; solo cambia el rótulo según la audiencia.
    label: 'Consignatarios',
    labelFor: (hasPermission) =>
      hasPermission('CONSIGNATARIOS_OPERARIO') ? 'Consignatarios' : 'Destinatarios',
    icon: Contact,
    permission: 'CONSIGNATARIOS_READ',
    permissionsAny: ['CONSIGNATARIOS_READ', 'ACCESO_ENLACE_CONSIGNATARIOS_READ'],
    keywords: ['consignatario', 'destinatario', 'cliente', 'contacto'],
  },
  guiasMaster: {
    to: '/guias-master',
    label: 'Guías master',
    icon: Boxes,
    permission: 'GUIAS_MASTER_READ',
    keywords: ['guia', 'master', 'piezas'],
  },
  paquetes: {
    to: '/paquetes',
    label: 'Paquetes',
    icon: Package,
    permission: 'PAQUETES_READ',
    keywords: ['paquete', 'gestion'],
  },
  pesaje: {
    to: '/pesaje',
    label: 'Pesaje',
    icon: Weight,
    permission: 'PAQUETES_PESO_WRITE',
    keywords: ['peso', 'pesar', 'balanza'],
  },
  paquetesVencidos: {
    to: '/paquetes-vencidos',
    label: 'Paquetes vencidos',
    icon: AlertTriangle,
    permission: 'PAQUETES_PESO_WRITE',
    keywords: ['vencido', 'retiro', 'plazo'],
  },
  lotesRecepcion: {
    to: '/lotes-recepcion',
    label: 'Lotes de recepción',
    icon: ClipboardList,
    permission: 'LOTES_RECEPCION_READ',
    keywords: ['recepcion', 'lote', 'llegada'],
  },
  enviosConsolidados: {
    to: '/envios-consolidados',
    label: 'Envíos consolidados',
    icon: Plane,
    permission: 'ENVIOS_CONSOLIDADOS_READ',
    keywords: ['envio', 'consolidado', 'aereo', 'manifiesto'],
  },
  manifiestos: {
    to: '/manifiestos',
    label: 'Manifiestos',
    icon: FileText,
    permission: 'MANIFIESTOS_READ',
    keywords: ['manifiesto', 'carga'],
  },
  despachos: {
    to: '/despachos',
    label: 'Despachos',
    icon: Truck,
    permission: 'DESPACHOS_WRITE',
    keywords: ['despacho', 'envio', 'salida'],
  },
  liquidaciones: {
    to: '/liquidaciones',
    label: 'Liquidaciones',
    icon: Wallet,
    permission: 'LIQUIDACION_CONSOLIDADO_READ',
    keywords: [
      'liquidacion',
      'pago',
      'cobro',
      'margen',
      'ingreso',
      'distribucion',
      'tarifa',
      'finanzas',
    ],
  },
  couriersEntrega: {
    to: '/couriers-entrega',
    label: 'Couriers de entrega',
    icon: PackageCheck,
    permission: 'COURIERS_ENTREGA_READ',
    keywords: ['courier', 'courier de entrega', 'empresa de entrega'],
  },
  agencias: {
    to: '/agencias',
    label: 'Agencias',
    icon: Building2,
    permission: 'AGENCIAS_READ',
    keywords: ['agencia', 'oficina'],
  },
  puntosEntrega: {
    to: '/puntos-entrega',
    label: 'Puntos de entrega',
    icon: Building2,
    permission: 'PUNTOS_ENTREGA_READ',
    keywords: ['punto', 'entrega', 'agencia courier de entrega'],
  },
  usuarios: {
    to: '/usuarios',
    label: 'Usuarios',
    icon: Users,
    permission: 'USUARIOS_READ',
  },
  enlacesAcceso: {
    to: '/enlaces-acceso',
    label: 'Enlaces de acceso',
    icon: Link2,
    permission: 'ACCESO_ENLACES_MANAGE',
    keywords: ['enlace', 'acceso', 'compartir', 'link', 'paquetes', 'solo lectura'],
  },
  roles: {
    to: '/roles',
    label: 'Roles de acceso',
    icon: Shield,
    permission: 'ROLES_READ',
  },
  permisos: {
    to: '/permisos',
    label: 'Permisos de acceso',
    icon: Key,
    permission: 'PERMISOS_READ',
  },
  parametros: {
    to: '/parametros-sistema',
    label: 'Parámetros del sistema',
    icon: Settings,
    permission: 'PARAMETROS_SISTEMA_READ',
    children: PARAMETROS_SISTEMA_SECCIONES,
  },
} satisfies Record<string, NavItem>;

/**
 * Composición CLIENTE (y base de acceso por enlace): el flujo del cliente
 * empieza por su casillero. «Mi casillero» va primero en «Mis envíos».
 */
const CLIENTE_GROUPS: NavGroup[] = [
  { label: 'Principal', items: [NAV.inicio] },
  {
    label: 'Mis envíos',
    items: [NAV.casillero, NAV.consignatarios, NAV.misGuias, NAV.misEntregas],
  },
];

/** Composición OPERARIO: agrupada por tareas del flujo logístico. */
const OPERARIO_GROUPS: NavGroup[] = [
  { label: 'Inicio y seguimiento', items: [NAV.inicio, NAV.estadisticas] },
  {
    label: 'Gestión de clientes',
    items: [NAV.consignatarios, NAV.guiasMaster, NAV.paquetes, NAV.pesaje, NAV.paquetesVencidos],
  },
  {
    label: 'Recepción y transporte',
    items: [NAV.lotesRecepcion, NAV.enviosConsolidados, NAV.manifiestos],
  },
  { label: 'Entrega y cierre', items: [NAV.despachos, NAV.liquidaciones] },
  { label: 'Red de entrega', items: [NAV.couriersEntrega, NAV.agencias, NAV.puntosEntrega] },
];

/** Grupos exclusivos del ADMINISTRADOR (se suman a los de operario). */
const ADMIN_GROUPS: NavGroup[] = [
  {
    label: 'Accesos y seguridad',
    items: [NAV.usuarios, NAV.enlacesAcceso, NAV.roles, NAV.permisos],
  },
  { label: 'Configuración', items: [NAV.parametros] },
];

/**
 * Grupo «Mi cuenta» que se añade al final para un usuario MIXTO (permisos de
 * operario + permisos de cliente, sin ser admin): el árbol operativo es el
 * principal y sus vistas personales quedan agrupadas aparte, sin mezclarse.
 */
const MI_CUENTA_GROUP: NavGroup = {
  label: 'Mi cuenta',
  items: [NAV.casillero, NAV.misGuias, NAV.misEntregas],
};

/**
 * Árbol completo de back-office (operario + admin). Se conserva por
 * compatibilidad y como ancla de auditoría; las audiencias se resuelven en
 * {@link getVisibleNavGroups}, no filtrando este árbol global.
 */
export const DASHBOARD_NAV_GROUPS: NavGroup[] = [...OPERARIO_GROUPS, ...ADMIN_GROUPS];

// Señales de audiencia derivadas SOLO de permisos (nunca del nombre del rol).
const PERMISOS_OPERARIO = [
  'CONSIGNATARIOS_OPERARIO',
  'GUIAS_MASTER_READ',
  'PAQUETES_READ',
  'PAQUETES_PESO_WRITE',
  'LOTES_RECEPCION_READ',
  'ENVIOS_CONSOLIDADOS_READ',
  'DESPACHOS_WRITE',
  'MANIFIESTOS_READ',
  'LIQUIDACION_CONSOLIDADO_READ',
  'COURIERS_ENTREGA_READ',
  'AGENCIAS_READ',
  'PUNTOS_ENTREGA_READ',
  'ESTADISTICAS_READ',
];
const PERMISOS_ADMIN = ['USUARIOS_READ', 'ROLES_READ', 'PERMISOS_READ', 'ACCESO_ENLACES_MANAGE'];
// Vistas exclusivas de cliente (NO incluye CONSIGNATARIOS_READ, que comparten
// cliente y operario): así un operario puro no se clasifica como mixto.
const PERMISOS_CLIENTE = ['MIS_GUIAS_READ', 'MIS_ENTREGAS_READ', 'CASILLERO_READ'];

/**
 * Composición de navegación por audiencia (derivada de permisos):
 * - Acceso por enlace: composición de cliente, mostrando solo items con permiso
 *   explícito (sin Inicio ni Casillero salvo autorización).
 * - Operario / admin: árbol operativo como principal; admin suma sus grupos;
 *   un usuario mixto (operario + cliente, no admin) recibe «Mi cuenta» al final.
 * - Cliente puro (o sin permisos): composición de cliente.
 */
function composeForAudience(
  hasPermission: (permission: string) => boolean,
  onlyWithPermission: boolean,
): NavGroup[] {
  if (onlyWithPermission) return CLIENTE_GROUPS;
  const esOperario = PERMISOS_OPERARIO.some((p) => hasPermission(p));
  const esAdmin = PERMISOS_ADMIN.some((p) => hasPermission(p));
  const esCliente = PERMISOS_CLIENTE.some((p) => hasPermission(p));
  if (esOperario || esAdmin) {
    const groups = [...OPERARIO_GROUPS];
    if (esAdmin) groups.push(...ADMIN_GROUPS);
    if (esCliente && !esAdmin) groups.push(MI_CUENTA_GROUP);
    return groups;
  }
  return CLIENTE_GROUPS;
}

function isItemVisible(
  item: Pick<NavItem, 'permission' | 'permissionsAny'>,
  hasPermission: (permission: string) => boolean,
  onlyWithPermission: boolean,
): boolean {
  const itemPermissions = item.permissionsAny ?? (item.permission ? [item.permission] : []);
  return itemPermissions.length > 0
    ? itemPermissions.some((permission) => hasPermission(permission))
    : !onlyWithPermission;
}

export function getVisibleNavGroups(
  hasPermission: (permission: string) => boolean,
  opts?: { onlyWithPermission?: boolean },
): NavGroup[] {
  // Para sesiones por enlace (onlyWithPermission) se ocultan los ítems sin
  // permiso explícito (Inicio, Mi casillero...), dejando solo los de cliente.
  const onlyWithPermission = opts?.onlyWithPermission ?? false;
  const resolveLabel = (item: NavItem): NavItem =>
    item.labelFor ? { ...item, label: item.labelFor(hasPermission) } : item;
  const composition = composeForAudience(hasPermission, onlyWithPermission);
  return composition.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => isItemVisible(item, hasPermission, onlyWithPermission))
      .map(resolveLabel)
      .map((item) =>
        item.children
          ? {
              ...item,
              children: item.children
                .filter((child) =>
                  isItemVisible(child, hasPermission, onlyWithPermission),
                )
                .map(resolveLabel),
            }
          : item,
      )
      .filter((item) => !item.children || item.children.length > 0),
  })).filter((group) => group.items.length > 0);
}

export function getVisibleNavItems(
  hasPermission: (permission: string) => boolean,
  opts?: { onlyWithPermission?: boolean },
): NavItem[] {
  return getVisibleNavGroups(hasPermission, opts).flatMap((group) =>
    group.items.flatMap((item) => (item.children ? [item, ...item.children] : [item])),
  );
}
