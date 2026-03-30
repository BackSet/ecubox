import { useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, Users, Shield, Key, Weight, Truck, ClipboardList, Settings, MapPin, Package, Globe, Tag } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface GlobalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navItems = [
  { to: '/inicio', label: 'Inicio', keywords: ['dashboard', 'home'], icon: LayoutDashboard, permission: undefined as string | undefined },
  { to: '/agencia-eeuu', label: 'Agencia USA', keywords: ['agencia', 'usa', 'eeuu', 'newark', 'dirección', 'destino'], icon: Globe, permission: undefined },
  { to: '/destinatarios', label: 'Destinatarios', keywords: ['destinatarios', 'destinatario', 'mis destinatarios'], icon: MapPin, permission: 'DESTINATARIOS_READ' },
  { to: '/paquetes', label: 'Paquetes', keywords: ['paquetes', 'paquete', 'mis paquetes'], icon: Package, permission: 'PAQUETES_READ' },
  { to: '/usuarios', label: 'Usuarios', keywords: ['users', 'usuarios'], icon: Users, permission: 'USUARIOS_READ' },
  { to: '/roles', label: 'Roles', keywords: ['roles'], icon: Shield, permission: 'ROLES_READ' },
  { to: '/permisos', label: 'Permisos', keywords: ['permissions', 'permisos'], icon: Key, permission: 'PERMISOS_READ' },
  { to: '/cargar-pesos', label: 'Cargar pesos', keywords: ['pesos', 'paquetes', 'weight'], icon: Weight, permission: 'PAQUETES_PESO_WRITE' },
  {
    to: '/gestionar-estados-paquetes',
    label: 'Estados de paquetes',
    keywords: ['estados', 'paquetes', 'gestionar', 'tracking'],
    icon: Tag,
    permission: 'PAQUETES_PESO_WRITE',
  },
  { to: '/despachos', label: 'Despachos', keywords: ['despacho', 'armar', 'envío'], icon: Truck, permission: 'DESPACHOS_WRITE' },
  { to: '/lotes-recepcion', label: 'Lotes recepción', keywords: ['lote', 'recepción', 'guía', 'lotes recepción'], icon: ClipboardList, permission: 'DESPACHOS_WRITE' },
  { to: '/parametros-sistema', label: 'Parámetros', keywords: ['parametros', 'config', 'whatsapp', 'mensaje', 'agencia usa', 'sistema'], icon: Settings, permission: 'DESPACHOS_WRITE' },
];

export function GlobalCommandPalette({ open, onOpenChange }: GlobalCommandPaletteProps) {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const canSee = (item: (typeof navItems)[0]) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  };
  const items = navItems.filter(canSee);

  const handleSelect = (to: string) => {
    navigate({ to });
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <CommandInput
        placeholder="Buscar páginas..."
      />
      <CommandList className="max-h-[320px] overflow-y-auto p-2">
        <CommandEmpty className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">
          Sin resultados.
        </CommandEmpty>
        <CommandGroup heading="Navegación rápida" className="command-group-heading">
          {items.map(({ to, label, keywords, icon: Icon }) => (
            <CommandItem
              key={to}
              value={`${label} ${keywords?.join(' ') ?? ''}`}
              keywords={keywords}
              onSelect={() => handleSelect(to)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
