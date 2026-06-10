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
 * Estructura del sidebar alineada con el flujo de trabajo real del paquete
 * dentro del courier. Los grupos vacíos se ocultan automáticamente (ver
 * {@link getVisibleNavGroups}), por lo que un cliente puro solo verá los
 * grupos relevantes a su rol y un operario los suyos. Si un usuario tiene
 * ambos roles, verá la unión ordenada.
 *
 * Flujo (de arriba hacia abajo):
 *   1. Principal                     -> inicio, métricas y vistas del cliente.
 *   2. Operación                     -> consignatarios, guías, paquetes y estados.
 *   3. Recepción y consolidación     -> carga que entra y agrupación operativa.
 *   4. Despacho y cierre             -> salida, documentos y liquidación.
 *   5. Catálogos de entrega          -> maestros de red de última milla.
 *   6. Administración                -> accesos y seguridad.
 *   7. Configuración                 -> parámetros del sistema.
 */
export const DASHBOARD_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      {
        to: '/inicio',
        label: 'Inicio',
        icon: LayoutDashboard,
        exact: true,
        permission: 'INICIO_READ',
        keywords: ['dashboard', 'home', 'panel'],
      },
      {
        to: '/estadisticas',
        label: 'Estadísticas',
        icon: ChartNoAxesCombined,
        permission: 'ESTADISTICAS_READ',
        keywords: ['estadisticas', 'graficas', 'indicadores', 'demorados', 'kpi'],
      },
      {
        to: '/mis-guias',
        label: 'Mis guías',
        icon: Boxes,
        permission: 'MIS_GUIAS_READ',
        permissionsAny: ['MIS_GUIAS_READ', 'ACCESO_ENLACE_GUIAS_READ'],
        keywords: ['guia', 'tracking', 'envio'],
      },
      {
        to: '/mis-entregas',
        label: 'Mis entregas',
        icon: PackageCheck,
        permission: 'MIS_ENTREGAS_READ',
        permissionsAny: ['MIS_ENTREGAS_READ', 'ACCESO_ENLACE_MIS_ENTREGAS_READ'],
        keywords: ['entrega', 'recibi', 'confirmar', 'despacho', 'envio'],
      },
      {
        to: '/casillero',
        label: 'Mi casillero',
        icon: MapPin,
        permission: 'CASILLERO_READ',
        keywords: ['casillero', 'agencia', 'usa', 'eeuu', 'direccion', 'mailbox'],
      },
    ],
  },
  {
    label: 'Operación',
    items: [
      {
        to: '/consignatarios',
        label: 'Consignatarios',
        icon: Contact,
        permission: 'CONSIGNATARIOS_READ',
        permissionsAny: ['CONSIGNATARIOS_READ', 'ACCESO_ENLACE_CONSIGNATARIOS_READ'],
        keywords: ['consignatario', 'destinatario', 'cliente', 'contacto'],
      },
      {
        to: '/guias-master',
        label: 'Guías master',
        icon: Boxes,
        permission: 'GUIAS_MASTER_READ',
        keywords: ['guia', 'master', 'piezas'],
      },
      {
        to: '/paquetes',
        label: 'Paquetes',
        icon: Package,
        permission: 'PAQUETES_READ',
        keywords: ['paquete', 'gestion'],
      },
      {
        to: '/pesaje',
        label: 'Pesaje',
        icon: Weight,
        permission: 'PAQUETES_PESO_WRITE',
        keywords: ['peso', 'pesar', 'balanza'],
      },
      {
        to: '/paquetes-vencidos',
        label: 'Paquetes vencidos',
        icon: AlertTriangle,
        permission: 'PAQUETES_PESO_WRITE',
        keywords: ['vencido', 'retiro', 'plazo'],
      },
    ],
  },
  {
    label: 'Recepción y consolidación',
    items: [
      {
        to: '/lotes-recepcion',
        label: 'Lotes de recepción',
        icon: ClipboardList,
        permission: 'LOTES_RECEPCION_READ',
        keywords: ['recepcion', 'lote', 'llegada'],
      },
      {
        to: '/envios-consolidados',
        label: 'Envíos consolidados',
        icon: Plane,
        permission: 'ENVIOS_CONSOLIDADOS_READ',
        keywords: ['envio', 'consolidado', 'aereo', 'manifiesto'],
      },
    ],
  },
  {
    label: 'Despacho y cierre',
    items: [
      {
        to: '/despachos',
        label: 'Despachos',
        icon: Truck,
        permission: 'DESPACHOS_WRITE',
        keywords: ['despacho', 'envio', 'salida'],
      },
      {
        to: '/manifiestos',
        label: 'Manifiestos',
        icon: FileText,
        permission: 'MANIFIESTOS_READ',
        keywords: ['manifiesto', 'carga'],
      },
      {
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
    ],
  },
  {
    label: 'Catálogos de entrega',
    items: [
      {
        to: '/couriers-entrega',
        label: 'Couriers de entrega',
        icon: PackageCheck,
        permission: 'COURIERS_ENTREGA_READ',
        keywords: ['courier', 'courier de entrega', 'empresa de entrega'],
      },
      {
        to: '/agencias',
        label: 'Agencias',
        icon: Building2,
        permission: 'AGENCIAS_READ',
        keywords: ['agencia', 'oficina'],
      },
      {
        to: '/puntos-entrega',
        label: 'Puntos de entrega',
        icon: Building2,
        permission: 'PUNTOS_ENTREGA_READ',
        keywords: ['punto', 'entrega', 'agencia courier de entrega'],
      },
    ],
  },
  {
    label: 'Administración',
    items: [
      {
        to: '/usuarios',
        label: 'Usuarios',
        icon: Users,
        permission: 'USUARIOS_READ',
      },
      {
        to: '/enlaces-acceso',
        label: 'Enlaces de acceso',
        icon: Link2,
        permission: 'ACCESO_ENLACES_MANAGE',
        keywords: ['enlace', 'acceso', 'compartir', 'link', 'paquetes', 'solo lectura'],
      },
      {
        to: '/roles',
        label: 'Roles de acceso',
        icon: Shield,
        permission: 'ROLES_READ',
      },
      {
        to: '/permisos',
        label: 'Permisos de acceso',
        icon: Key,
        permission: 'PERMISOS_READ',
      },
    ],
  },
  {
    label: 'Configuración',
    items: [
      {
        to: '/parametros-sistema',
        label: 'Parámetros del sistema',
        icon: Settings,
        permission: 'PARAMETROS_SISTEMA_READ',
        children: PARAMETROS_SISTEMA_SECCIONES,
      },
    ],
  },
];

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
  return DASHBOARD_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => isItemVisible(item, hasPermission, onlyWithPermission))
      .map((item) =>
        item.children
          ? {
              ...item,
              children: item.children.filter((child) =>
                isItemVisible(child, hasPermission, onlyWithPermission),
              ),
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
