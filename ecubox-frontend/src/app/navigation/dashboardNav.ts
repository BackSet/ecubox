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
  Calculator,
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
    label: 'Principal',
    items: [
      { to: '/inicio', label: 'Inicio', icon: LayoutDashboard, exact: true, keywords: ['dashboard', 'home'] },
      { to: '/agencia-eeuu', label: 'Agencia USA', icon: MapPin, keywords: ['agencia', 'usa', 'eeuu'] },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/destinatarios', label: 'Destinatarios', icon: MapPin, permission: 'DESTINATARIOS_READ' },
      { to: '/paquetes', label: 'Paquetes', icon: Package, permission: 'PAQUETES_READ' },
      { to: '/cargar-pesos', label: 'Cargar pesos', icon: Weight, permission: 'PAQUETES_PESO_WRITE' },
      { to: '/gestionar-estados-paquetes', label: 'Estados de paquetes', icon: Tag, permission: 'PAQUETES_PESO_WRITE' },
      { to: '/despachos', label: 'Despachos', icon: Truck, permission: 'DESPACHOS_WRITE' },
      { to: '/lotes-recepcion', label: 'Lotes recepción', icon: ClipboardList, permission: 'DESPACHOS_WRITE' },
    ],
  },
  {
    label: 'Catálogos',
    items: [
      { to: '/agencias', label: 'Agencias', icon: Building2, permission: 'AGENCIAS_READ' },
      { to: '/agencias-distribuidor', label: 'Agencias distribuidor', icon: Building2, permission: 'AGENCIAS_DISTRIBUIDOR_READ' },
      { to: '/distribuidores', label: 'Distribuidores', icon: PackageCheck, permission: 'DISTRIBUIDORES_READ' },
      { to: '/manifiestos', label: 'Manifiestos', icon: FileText, permission: 'MANIFIESTOS_READ' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: Users, permission: 'USUARIOS_READ' },
      { to: '/roles', label: 'Roles', icon: Shield, permission: 'ROLES_READ' },
      { to: '/permisos', label: 'Permisos', icon: Key, permission: 'PERMISOS_READ' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { to: '/parametros-sistema', label: 'Parámetros', icon: Settings, permission: 'DESPACHOS_WRITE' },
      { to: '/tarifa-calculadora', label: 'Tarifa calculadora', icon: Calculator, permission: 'DESPACHOS_WRITE' },
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
