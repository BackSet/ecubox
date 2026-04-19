import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface SearchableComboboxProps<T> {
  value: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
  options: T[];
  getKey: (option: T) => string | number;
  getLabel: (option: T) => string;
  /** Texto plano usado para filtrar (acumulado). Si no se provee, usa getLabel. */
  getSearchText?: (option: T) => string;
  /** Render personalizado de cada item dentro de la lista. */
  renderOption?: (option: T, isSelected: boolean) => ReactNode;
  /** Render personalizado del valor seleccionado dentro del trigger. */
  renderSelected?: (option: T) => ReactNode;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  clearable?: boolean;
  id?: string;
  className?: string;
}

/**
 * Combobox genérico con búsqueda construido sobre Radix Popover.
 * Funciona correctamente dentro de un Radix Dialog: el Popover comparte
 * sistema de focus management y portal, así que no es recortado por el
 * `overflow` del DialogContent y los clicks no se interpretan como
 * "outside" del modal.
 */
export function SearchableCombobox<T>({
  value,
  onChange,
  options,
  getKey,
  getLabel,
  getSearchText,
  renderOption,
  renderSelected,
  disabled,
  placeholder = '— Selecciona —',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Sin coincidencias',
  clearable = true,
  id,
  className,
}: SearchableComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const selected = useMemo(
    () => options.find((o) => getKey(o) === value) ?? null,
    [options, value, getKey]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const text = getSearchText ? getSearchText(o) : getLabel(o);
      return text.toLowerCase().includes(q);
    });
  }, [options, query, getSearchText, getLabel]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
    }
  }, [open]);

  useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(Math.max(0, filtered.length - 1));
  }, [filtered.length, activeIdx]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLLIElement>(
      `[data-idx="${activeIdx}"]`
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  function selectIdx(i: number) {
    const opt = filtered[i];
    if (!opt) return;
    onChange(getKey(opt));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectIdx(activeIdx);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          id={id}
          disabled={disabled}
          className={cn(
            'input-clean flex w-full items-center justify-between gap-2 text-left',
            disabled && 'cursor-not-allowed opacity-60',
            className
          )}
          aria-haspopup="listbox"
        >
          <span
            className={cn(
              'flex-1 truncate',
              !selected && 'text-[var(--color-muted-foreground)]'
            )}
          >
            {selected
              ? renderSelected
                ? renderSelected(selected)
                : getLabel(selected)
              : placeholder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {clearable && selected && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Limpiar selección"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange(undefined);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(undefined);
                  }
                }}
                className="rounded p-0.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-[var(--color-muted-foreground)] transition-transform',
                open && 'rotate-180'
              )}
            />
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-[60] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-popover)]"
          style={{
            minWidth: 'max(var(--radix-popover-trigger-width), 320px)',
            maxWidth: 'min(480px, calc(100vw - 16px))',
            maxHeight: 'var(--radix-popover-content-available-height)',
          }}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <div className="border-b border-[var(--color-border)] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder={searchPlaceholder}
                className="h-8 pl-8 pr-2 text-sm"
              />
            </div>
          </div>
          <ul ref={listRef} role="listbox" className="max-h-64 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                {emptyMessage}
              </li>
            ) : (
              filtered.map((opt, i) => {
                const key = getKey(opt);
                const isSelected = key === value;
                const isActive = i === activeIdx;
                return (
                  <li
                    key={key}
                    data-idx={i}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => selectIdx(i)}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 px-3 py-2 text-sm',
                      isActive && 'bg-[var(--color-muted)]'
                    )}
                  >
                    <Check
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        isSelected ? 'text-[var(--color-primary)]' : 'opacity-0'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      {renderOption ? renderOption(opt, isSelected) : getLabel(opt)}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
