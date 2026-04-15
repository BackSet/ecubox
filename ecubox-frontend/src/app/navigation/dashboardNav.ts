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

export const DASHBOARD_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Inicio',
    items: [
      { to: '/inicio', label: 'Inicio', icon: LayoutDashboard, exact: true, keywords: ['dashboard', 'home'] },
      { to: '/agencia-eeuu', label: 'Oficina en USA', icon: MapPin, keywords: ['agencia', 'usa', 'eeuu'] },
    ],
  },
  {
    label: 'Operación diaria',
    items: [
      { to: '/destinatarios', label: 'Destinatarios', icon: MapPin, permission: 'DESTINATARIOS_READ' },
      { to: '/paquetes', label: 'Gestión de paquetes', icon: Package, permission: 'PAQUETES_READ' },
      { to: '/paquetes-vencidos', label: 'Retiros vencidos', icon: AlertTriangle, permission: 'PAQUETES_PESO_WRITE' },
      { to: '/cargar-pesos', label: 'Registro de peso', icon: Weight, permission: 'PAQUETES_PESO_WRITE' },
      { to: '/gestionar-estados-paquetes', label: 'Cambio de estado', icon: Tag, permission: 'PAQUETES_PESO_WRITE' },
      { to: '/despachos', label: 'Gestión de despachos', icon: Truck, permission: 'DESPACHOS_WRITE' },
      { to: '/lotes-recepcion', label: 'Lotes de recepción', icon: ClipboardList, permission: 'DESPACHOS_WRITE' },
    ],
  },
  {
    label: 'Catálogos',
    items: [
      { to: '/agencias', label: 'Agencias', icon: Building2, permission: 'AGENCIAS_READ' },
      { to: '/agencias-distribuidor', label: 'Agencias asociadas', icon: Building2, permission: 'AGENCIAS_DISTRIBUIDOR_READ' },
      { to: '/distribuidores', label: 'Empresas de entrega', icon: PackageCheck, permission: 'DISTRIBUIDORES_READ' },
      { to: '/manifiestos', label: 'Manifiestos de carga', icon: FileText, permission: 'MANIFIESTOS_READ' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: Users, permission: 'USUARIOS_READ' },
      { to: '/roles', label: 'Roles de acceso', icon: Shield, permission: 'ROLES_READ' },
      { to: '/permisos', label: 'Permisos de acceso', icon: Key, permission: 'PERMISOS_READ' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { to: '/parametros-sistema', label: 'Parámetros del sistema', icon: Settings, permission: 'DESPACHOS_WRITE' },
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
