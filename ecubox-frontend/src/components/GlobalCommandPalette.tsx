import { useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, Users, Shield, Key, Weight, Truck, ClipboardList, Settings, MapPin, Package } from 'lucide-react';
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
  { to: '/destinatarios', label: 'Mis Destinatarios', keywords: ['destinatarios', 'destinatario'], icon: MapPin, permission: 'DESTINATARIOS_READ' },
  { to: '/paquetes', label: 'Mis Paquetes', keywords: ['paquetes', 'paquete'], icon: Package, permission: 'PAQUETES_READ' },
  { to: '/usuarios', label: 'Usuarios', keywords: ['users', 'usuarios'], icon: Users, permission: 'USUARIOS_READ' },
  { to: '/roles', label: 'Roles', keywords: ['roles'], icon: Shield, permission: 'ROLES_READ' },
  { to: '/permisos', label: 'Permisos', keywords: ['permissions', 'permisos'], icon: Key, permission: 'PERMISOS_READ' },
  { to: '/cargar-pesos', label: 'Cargar pesos', keywords: ['pesos', 'paquetes', 'weight'], icon: Weight, permission: 'PAQUETES_PESO_WRITE' },
  { to: '/despachos', label: 'Despachos', keywords: ['despacho', 'armar', 'envío'], icon: Truck, permission: 'DESPACHOS_WRITE' },
  { to: '/lotes-recepcion', label: 'Lotes de recepción', keywords: ['lote', 'recepción', 'guía'], icon: ClipboardList, permission: 'DESPACHOS_WRITE' },
  { to: '/parametros-sistema', label: 'Parámetros sistema', keywords: ['parametros', 'config', 'whatsapp', 'mensaje'], icon: Settings, permission: 'DESPACHOS_WRITE' },
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
        <CommandGroup heading="Navegación rápida" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[var(--color-muted-foreground)]">
          {items.map(({ to, label, keywords, icon: Icon }) => (
            <CommandItem
              key={to}
              value={`${label} ${keywords?.join(' ') ?? ''}`}
              keywords={keywords}
              onSelect={() => handleSelect(to)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-[var(--color-foreground)] outline-none data-[selected=true]:bg-[var(--color-muted)]"
            >
              <Icon className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
