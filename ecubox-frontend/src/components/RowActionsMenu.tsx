import type { ComponentType, MouseEvent, SVGProps } from 'react';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type IconType = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export interface RowActionItem {
  type?: 'item';
  label: string;
  icon?: IconType;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  loading?: boolean;
  hidden?: boolean;
  shortcut?: string;
}

export interface RowActionSeparator {
  type: 'separator';
  hidden?: boolean;
}

export type RowActionEntry = RowActionItem | RowActionSeparator;

interface RowActionsMenuProps {
  items: RowActionEntry[];
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  ariaLabel?: string;
  triggerClassName?: string;
}

/**
 * Men\u00fa de acciones por fila tipo "kebab" (\u22ee). Acepta items con icono,
 * estado de loading/disabled, items destructivos y separadores entre grupos
 * l\u00f3gicos. Filtra autom\u00e1ticamente items y separadores con `hidden: true`,
 * y colapsa separadores duplicados / al inicio / al final.
 */
export function RowActionsMenu({
  items,
  align = 'end',
  side,
  ariaLabel = 'M\u00e1s acciones',
  triggerClassName,
}: RowActionsMenuProps) {
  const visible = collapseSeparators(items.filter((it) => !it.hidden));
  if (visible.length === 0) return null;

  const handleTriggerClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={ariaLabel}
          onClick={handleTriggerClick}
          className={cn(
            'h-8 w-8 text-muted-foreground hover:text-foreground',
            triggerClassName,
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        className="min-w-[200px]"
        onClick={(e) => e.stopPropagation()}
      >
        {visible.map((entry, idx) => {
          if (entry.type === 'separator') {
            return <DropdownMenuSeparator key={`sep-${idx}`} />;
          }
          const Icon = entry.loading ? Loader2 : entry.icon;
          const disabled = entry.disabled || entry.loading;
          return (
            <DropdownMenuItem
              key={`${entry.label}-${idx}`}
              disabled={disabled}
              onSelect={(e) => {
                e.preventDefault();
                if (disabled) return;
                entry.onSelect();
              }}
              className={cn(
                entry.destructive &&
                  'text-[var(--color-destructive)] focus:text-[var(--color-destructive)] focus:bg-[var(--color-destructive)]/10',
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    'h-4 w-4',
                    entry.loading && 'animate-spin',
                    !entry.destructive && !entry.loading && 'text-muted-foreground',
                  )}
                />
              )}
              <span className="flex-1 truncate">{entry.label}</span>
              {entry.shortcut && (
                <DropdownMenuShortcut>{entry.shortcut}</DropdownMenuShortcut>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function collapseSeparators(entries: RowActionEntry[]): RowActionEntry[] {
  const out: RowActionEntry[] = [];
  for (const e of entries) {
    if (e.type === 'separator') {
      if (out.length === 0) continue;
      const prev = out[out.length - 1];
      if (prev.type === 'separator') continue;
      out.push(e);
    } else {
      out.push(e);
    }
  }
  while (out.length > 0 && out[out.length - 1].type === 'separator') {
    out.pop();
  }
  return out;
}
