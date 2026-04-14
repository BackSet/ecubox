import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { getVisibleNavItems } from '@/app/navigation/dashboardNav';

interface GlobalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalCommandPalette({ open, onOpenChange }: GlobalCommandPaletteProps) {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const items = getVisibleNavItems(hasPermission);

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
          {items.map(({ to, label, keywords = [], icon: Icon }) => (
            <CommandItem
              key={to}
              value={`${label} ${keywords.join(' ')}`}
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
