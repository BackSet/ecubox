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
 * Estructura del sidebar dividida por flujos de trabajo. Los grupos vacíos
 * se ocultan automáticamente (ver {@link getVisibleNavGroups}), por lo que
 * un cliente puro solo verá los grupos relevantes para su rol y un operario
 * verá los suyos. Si un usuario tiene ambos roles, verá la unión ordenada.
 *
 * Convención: cliente arriba (su día a día), operación en el medio
 * (de izquierda a derecha siguiendo el flujo del paquete: Recepción ->
 * Paquetes/Guías -> Despacho/Consolidación) y administración al final.
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
        to: '/agencia-eeuu',
        label: 'Oficina en USA',
        icon: MapPin,
        keywords: ['agencia', 'usa', 'eeuu', 'direccion'],
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
        to: '/cargar-pesos',
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
    label: 'Paquetes y guías',
    items: [
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
      {
        to: '/guias-master',
        label: 'Guías',
        icon: Boxes,
        permission: 'GUIAS_MASTER_READ',
        keywords: ['guia', 'master', 'piezas'],
      },
    ],
  },
  {
    label: 'Despachos y consolidación',
    items: [
      {
        to: '/despachos',
        label: 'Gestión de despachos',
        icon: Truck,
        permission: 'DESPACHOS_WRITE',
        keywords: ['despacho', 'envio', 'salida'],
      },
      {
        to: '/envios-consolidados',
        label: 'Envíos consolidados',
        icon: Plane,
        permission: 'ENVIOS_CONSOLIDADOS_READ',
        keywords: ['envio', 'consolidado', 'aereo', 'manifiesto'],
      },
      {
        to: '/manifiestos',
        label: 'Manifiestos de carga',
        icon: FileText,
        permission: 'MANIFIESTOS_READ',
        keywords: ['manifiesto', 'carga'],
      },
    ],
  },
  {
    label: 'Catálogos',
    items: [
      {
        to: '/destinatarios',
        label: 'Destinatarios',
        icon: Contact,
        permission: 'DESTINATARIOS_READ',
        keywords: ['destinatario', 'cliente', 'contacto'],
      },
      {
        to: '/agencias',
        label: 'Agencias',
        icon: Building2,
        permission: 'AGENCIAS_READ',
      },
      {
        to: '/agencias-distribuidor',
        label: 'Agencias asociadas',
        icon: Building2,
        permission: 'AGENCIAS_DISTRIBUIDOR_READ',
      },
      {
        to: '/distribuidores',
        label: 'Empresas de entrega',
        icon: PackageCheck,
        permission: 'DISTRIBUIDORES_READ',
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
