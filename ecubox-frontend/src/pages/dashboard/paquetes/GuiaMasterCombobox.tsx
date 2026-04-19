import { useEffect, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { GuiaMaster } from '@/types/guia-master';

interface Props {
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  options: GuiaMaster[];
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  id?: string;
}

/**
 * Combobox con búsqueda para seleccionar una guía master. Filtra por
 * `trackingBase` y `destinatarioNombre` (case-insensitive).
 *
 * Implementado sobre Radix Popover, lo que permite que funcione correctamente
 * incluso cuando el combobox vive dentro de un Radix Dialog (el Popover
 * comparte el sistema de focus management y portal con el Dialog, así que
 * el input recibe foco, los clicks no se intercepten como "outside" del
 * modal y el popup no queda recortado por el `overflow` del DialogContent).
 */
export function GuiaMasterCombobox({
  value,
  onChange,
  options,
  disabled,
  placeholder = '— Selecciona una guía —',
  emptyMessage = 'Sin coincidencias',
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const a = o.trackingBase?.toLowerCase() ?? '';
      const b = o.destinatarioNombre?.toLowerCase() ?? '';
      return a.includes(q) || b.includes(q);
    });
  }, [options, query]);

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
    const el = listRef.current?.querySelector<HTMLLIElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  function selectIdx(i: number) {
    const opt = filtered[i];
    if (!opt) return;
    onChange(opt.id);
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
            disabled && 'cursor-not-allowed opacity-60'
          )}
          aria-haspopup="listbox"
        >
          <span
            className={cn(
              'flex-1 truncate',
              !selected && 'text-[var(--color-muted-foreground)]'
            )}
          >
            {selected ? <SelectedLabel gm={selected} /> : placeholder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {selected && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Limpiar selección"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange(undefined);
                }}
                onPointerDown={(e) => {
                  // evita que el clic en la X dispare el toggle del Popover
                  e.stopPropagation();
                }}
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
            // Al menos el ancho del trigger, pero nunca menos de 320px,
            // para que el input de búsqueda no quede recortado cuando el
            // botón vive en una columna estrecha del formulario.
            minWidth: 'max(var(--radix-popover-trigger-width), 320px)',
            maxWidth: 'min(480px, calc(100vw - 16px))',
            maxHeight: 'var(--radix-popover-content-available-height)',
          }}
          onOpenAutoFocus={(e) => {
            // Dejamos que sea el <Input> con autoFocus quien capture el foco
            // (en lugar del Popover.Content, que es el primer focusable).
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
                placeholder="Buscar por guía o destinatario..."
                className="h-8 pl-8 pr-2 text-sm"
              />
            </div>
          </div>
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-64 overflow-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                {emptyMessage}
              </li>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.id === value;
                const isActive = i === activeIdx;
                return (
                  <li
                    key={opt.id}
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
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-sm font-medium">
                          {opt.trackingBase}
                        </span>
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          {opt.totalPiezasEsperadas
                            ? `${opt.piezasRegistradas ?? 0}/${opt.totalPiezasEsperadas}`
                            : `${opt.piezasRegistradas ?? 0}`}{' '}
                          piezas
                        </span>
                      </div>
                      {opt.destinatarioNombre && (
                        <div className="truncate text-xs text-[var(--color-muted-foreground)]">
                          {opt.destinatarioNombre}
                        </div>
                      )}
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

function SelectedLabel({ gm }: { gm: GuiaMaster }) {
  const piezas = gm.totalPiezasEsperadas
    ? `${gm.piezasRegistradas ?? 0}/${gm.totalPiezasEsperadas}`
    : `${gm.piezasRegistradas ?? 0}`;
  return (
    <span className="flex items-center gap-2">
      <span className="font-mono">{gm.trackingBase}</span>
      <span className="text-xs text-[var(--color-muted-foreground)]">({piezas})</span>
      {gm.destinatarioNombre && (
        <span className="truncate text-xs text-[var(--color-muted-foreground)]">
          — {gm.destinatarioNombre}
        </span>
      )}
    </span>
  );
}
