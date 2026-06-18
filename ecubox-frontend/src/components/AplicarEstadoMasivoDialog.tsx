import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckSquare, ChevronDown, ChevronUp, Search, Square, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface AplicarEstadoItem {
  id: number;
  searchText: string;
  content: ReactNode;
  /**
   * Si está presente, el item NO es elegible para la acción seleccionada:
   * se muestra deshabilitado (colapsado bajo "Mostrar no elegibles") con
   * esta razón visible, en lugar de ocultarse silenciosamente.
   */
  disabledReason?: string;
}

export interface AplicarEstadoOption {
  value: string;
  label: string;
  meta?: string;
}

export interface AplicarEstadoFilter {
  value: string;
  label: string;
  count: number;
  matches: (item: AplicarEstadoItem) => boolean;
}

interface Props {
  open: boolean;
  title: string;
  description: string;
  selectionLabel: string;
  searchPlaceholder: string;
  items: AplicarEstadoItem[];
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  options: AplicarEstadoOption[];
  selectedOption: string;
  onSelectedOptionChange: (value: string) => void;
  optionLabel: string;
  optionHelp?: ReactNode;
  headerExtra?: ReactNode;
  contentExtra?: ReactNode;
  filters?: AplicarEstadoFilter[];
  loading: boolean;
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  /** Texto del botón de confirmar (default: "Aplicar estado"). */
  confirmLabel?: string;
  /** Placeholder del selector de acción/estado. */
  selectPlaceholder?: string;
  /** Mensaje cuando aún no se eligió acción/estado. */
  emptyHint?: string;
  confirmDisabled?: boolean;
}

export function AplicarEstadoMasivoDialog({
  open,
  title,
  description,
  selectionLabel,
  searchPlaceholder,
  items,
  selectedIds,
  onSelectedIdsChange,
  options,
  selectedOption,
  onSelectedOptionChange,
  optionLabel,
  optionHelp,
  headerExtra,
  contentExtra,
  filters = [],
  loading,
  onConfirm,
  onOpenChange,
  confirmLabel = 'Aplicar estado',
  selectPlaceholder = 'Selecciona un estado...',
  emptyHint,
  confirmDisabled = false,
}: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showNoElegibles, setShowNoElegibles] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setFilter('');
      setShowNoElegibles(false);
    }
  }, [open]);

  const { visibleElegibles, visibleNoElegibles } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeFilter = filters.find((item) => item.value === filter);
    const visibles = items.filter((item) => {
      if (activeFilter && !activeFilter.matches(item)) return false;
      return !q || item.searchText.toLowerCase().includes(q);
    });
    return {
      visibleElegibles: visibles.filter((item) => !item.disabledReason),
      visibleNoElegibles: visibles.filter((item) => item.disabledReason),
    };
  }, [filter, filters, items, search]);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    visibleElegibles.length > 0 && visibleElegibles.every((item) => selected.has(item.id));

  const toggle = (id: number) => {
    onSelectedIdsChange(
      selected.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id],
    );
  };

  const toggleVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleElegibles.map((item) => item.id));
      onSelectedIdsChange(selectedIds.filter((id) => !visibleIds.has(id)));
      return;
    }
    onSelectedIdsChange(
      Array.from(new Set([...selectedIds, ...visibleElegibles.map((item) => item.id)])),
    );
  };

  const disabled = loading || confirmDisabled || !selectedOption || selectedIds.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Tag className="h-4 w-4" />
            </span>
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {headerExtra}

          <div className="space-y-1.5">
            <Label htmlFor="estado-masivo-select">{optionLabel}</Label>
            {options.length === 0 ? (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                No hay estados manuales disponibles.
              </div>
            ) : (
              <Select value={selectedOption} onValueChange={onSelectedOptionChange}>
                <SelectTrigger id="estado-masivo-select">
                  <SelectValue placeholder={selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="inline-flex items-center gap-2">
                        <span>{option.label}</span>
                        {option.meta && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {option.meta}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {optionHelp && <div className="text-xs text-muted-foreground">{optionHelp}</div>}
          </div>

          {!selectedOption ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              {emptyHint ?? `Selecciona un estado para ver los ${selectionLabel} elegibles.`}
            </div>
          ) : (
            <div className="space-y-3">
              {filters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={filter === '' ? 'default' : 'outline'}
                    onClick={() => setFilter('')}
                  >
                    Todos
                    <Badge variant="secondary" className="ml-2">{items.length}</Badge>
                  </Button>
                  {filters.map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      size="sm"
                      variant={filter === item.value ? 'default' : 'outline'}
                      onClick={() => setFilter(filter === item.value ? '' : item.value)}
                    >
                      {item.label}
                      <Badge variant="secondary" className="ml-2">{item.count}</Badge>
                    </Button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="pl-8"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleVisible}
                  disabled={visibleElegibles.length === 0}
                >
                  {allVisibleSelected ? (
                    <Square className="mr-2 h-4 w-4" />
                  ) : (
                    <CheckSquare className="mr-2 h-4 w-4" />
                  )}
                  {allVisibleSelected ? 'Quitar visibles' : 'Marcar visibles'}
                </Button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                {visibleElegibles.length === 0 && visibleNoElegibles.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No hay elementos que coincidan.
                  </div>
                ) : (
                  <>
                    {visibleElegibles.length === 0 && (
                      <div className="border-b border-border p-3 text-center text-sm text-muted-foreground">
                        No hay {selectionLabel} elegibles para esta acción.
                      </div>
                    )}
                    <ul className="divide-y divide-border">
                      {visibleElegibles.map((item) => (
                        <li key={item.id}>
                          <label
                            className={cn(
                              'flex cursor-pointer items-center gap-3 px-3 py-2',
                              selected.has(item.id) ? 'bg-primary/5' : 'hover:bg-muted/40',
                            )}
                          >
                            <Checkbox
                              checked={selected.has(item.id)}
                              onCheckedChange={() => toggle(item.id)}
                            />
                            <div className="min-w-0 flex-1">{item.content}</div>
                          </label>
                        </li>
                      ))}
                    </ul>
                    {visibleNoElegibles.length > 0 && (
                      <div className="border-t border-border">
                        <button
                          type="button"
                          onClick={() => setShowNoElegibles((v) => !v)}
                          className="flex w-full items-center justify-center gap-2 bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50"
                        >
                          {showNoElegibles ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                          {showNoElegibles
                            ? 'Ocultar no elegibles'
                            : `Mostrar no elegibles (${visibleNoElegibles.length})`}
                        </button>
                        {showNoElegibles && (
                          <ul className="divide-y divide-border border-t border-border">
                            {visibleNoElegibles.map((item) => (
                              <li key={item.id}>
                                <div className="flex items-start gap-3 px-3 py-2 opacity-60">
                                  <Checkbox disabled checked={false} className="mt-0.5" />
                                  <div className="min-w-0 flex-1">
                                    {item.content}
                                    <p className="mt-0.5 text-[11px] text-warning">
                                      {item.disabledReason}
                                    </p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {contentExtra}

              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                {selectedIds.length === 0
                  ? `Selecciona al menos un ${selectionLabel.replace(/s$/, '')}.`
                  : `${selectedIds.length} ${selectionLabel} seleccionados.`}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse justify-end gap-2 pt-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={disabled}>
            <Tag className="mr-2 h-4 w-4" />
            {loading ? 'Aplicando...' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
