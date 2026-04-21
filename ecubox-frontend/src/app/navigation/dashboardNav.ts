import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Users,
  Shield,
  Key,
  MapPin,
  Package,
  Weight,
  Tag,
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
} from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  permission?: string;
  keywords?: string[];
};

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
 * Flujo (de arriba hacia abajo, siguiendo el paquete a lo largo del tiempo):
 *   1. Inicio                        -> home y datos que el cliente necesita
 *                                       antes de comprar (dirección en USA).
 *   2. Mis envíos                    -> vista del cliente.
 *   3. Recepción y peso              -> llegada de la carga: lote -> pesaje
 *                                       -> seguimiento de retiros vencidos.
 *   4. Guías y paquetes              -> clasificación interna una vez pesado:
 *                                       guía master (agrupación) -> paquete
 *                                       individual -> cambios de estado.
 *   5. Consolidación y despachos     -> preparación de la salida: envío
 *                                       consolidado -> despacho al cliente
 *                                       final vía agencia -> manifiesto de
 *                                       carga como cierre documental.
 *   6. Catálogos                     -> datos maestros (uso recurrente primero).
 *   7. Administración                -> usuarios, roles y permisos.
 *   8. Configuración                 -> parámetros del sistema.
 */
export const DASHBOARD_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Inicio',
    items: [
      {
        to: '/inicio',
        label: 'Inicio',
        icon: LayoutDashboard,
        exact: true,
        keywords: ['dashboard', 'home', 'panel'],
      },
      {
        to: '/casillero',
        label: 'Mi casillero',
        icon: MapPin,
        keywords: ['casillero', 'agencia', 'usa', 'eeuu', 'direccion', 'mailbox'],
      },
    ],
  },
  {
    label: 'Mis envíos',
    items: [
      {
        to: '/mis-guias',
        label: 'Mis guías',
        icon: Boxes,
        permission: 'MIS_GUIAS_READ',
        keywords: ['guia', 'tracking', 'envio'],
      },
    ],
  },
  {
    label: 'Recepción y peso',
    items: [
      {
        to: '/lotes-recepcion',
        label: 'Lotes de recepción',
        icon: ClipboardList,
        permission: 'DESPACHOS_WRITE',
        keywords: ['recepcion', 'lote', 'llegada'],
      },
      {
        to: '/pesaje',
        label: 'Registro de peso',
        icon: Weight,
        permission: 'PAQUETES_PESO_WRITE',
        keywords: ['peso', 'pesar', 'balanza'],
      },
      {
        to: '/paquetes-vencidos',
        label: 'Retiros vencidos',
        icon: AlertTriangle,
        permission: 'PAQUETES_PESO_WRITE',
        keywords: ['vencido', 'retiro', 'plazo'],
      },
    ],
  },
  {
    label: 'Guías y paquetes',
    items: [
      {
        to: '/guias-master',
        label: 'Guías',
        icon: Boxes,
        permission: 'GUIAS_MASTER_READ',
        keywords: ['guia', 'master', 'piezas'],
      },
      {
        to: '/paquetes',
        label: 'Gestión de paquetes',
        icon: Package,
        permission: 'PAQUETES_READ',
        keywords: ['paquete', 'gestion'],
      },
      {
        to: '/gestionar-estados-paquetes',
        label: 'Cambio de estado',
        icon: Tag,
        permission: 'PAQUETES_PESO_WRITE',
        keywords: ['estado', 'rastreo'],
      },
    ],
  },
  {
    label: 'Consolidación y despachos',
    items: [
      {
        to: '/envios-consolidados',
        label: 'Envíos consolidados',
        icon: Plane,
        permission: 'ENVIOS_CONSOLIDADOS_READ',
        keywords: ['envio', 'consolidado', 'aereo', 'manifiesto'],
      },
      {
        to: '/despachos',
        label: 'Gestión de despachos',
        icon: Truck,
        permission: 'DESPACHOS_WRITE',
        keywords: ['despacho', 'envio', 'salida'],
      },
      {
        to: '/manifiestos',
        label: 'Manifiestos de carga',
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
    label: 'Catálogos',
    items: [
      {
        to: '/consignatarios',
        label: 'Consignatarios',
        icon: Contact,
        permission: 'CONSIGNATARIOS_READ',
        keywords: ['consignatario', 'consignatario', 'cliente', 'contacto'],
      },
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
        permission: 'DESPACHOS_WRITE',
      },
    ],
  },
];

export function getVisibleNavGroups(hasPermission: (permission: string) => boolean): NavGroup[] {
  return DASHBOARD_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((group) => group.items.length > 0);
}

export function getVisibleNavItems(hasPermission: (permission: string) => boolean): NavItem[] {
  return getVisibleNavGroups(hasPermission).flatMap((group) => group.items);
}
