import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarClock, CheckSquare, ListChecks, Search, Square, Tag } from 'lucide-react';
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
  date?: string | null;
  content: ReactNode;
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
  mode: 'periodo' | 'seleccion';
  onModeChange: (mode: 'periodo' | 'seleccion') => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  options: AplicarEstadoOption[];
  selectedOption: string;
  onSelectedOptionChange: (value: string) => void;
  optionLabel: string;
  optionHelp?: ReactNode;
  headerExtra?: ReactNode;
  filters?: AplicarEstadoFilter[];
  hideModoSelector?: boolean;
  periodHelp: ReactNode;
  loading: boolean;
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
}

function localIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
  mode,
  onModeChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  options,
  selectedOption,
  onSelectedOptionChange,
  optionLabel,
  optionHelp,
  headerExtra,
  filters = [],
  hideModoSelector = false,
  periodHelp,
  loading,
  onConfirm,
  onOpenChange,
}: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const today = useMemo(() => localIsoDate(new Date()), []);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setFilter('');
    }
  }, [open]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeFilter = filters.find((item) => item.value === filter);
    return items.filter((item) => {
      if (activeFilter && !activeFilter.matches(item)) return false;
      return !q || item.searchText.toLowerCase().includes(q);
    });
  }, [filter, filters, items, search]);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((item) => selected.has(item.id));

  const period = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    const from = new Date(`${dateFrom}T00:00:00`).getTime();
    const to = new Date(`${dateTo}T23:59:59`).getTime();
    if (from > to) return { invalid: true, count: 0 };
    return {
      invalid: false,
      count: items.filter((item) => {
        if (!item.date) return false;
        const value = new Date(item.date).getTime();
        return value >= from && value <= to;
      }).length,
    };
  }, [dateFrom, dateTo, items]);

  const toggle = (id: number) => {
    onSelectedIdsChange(
      selected.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id],
    );
  };

  const toggleVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleItems.map((item) => item.id));
      onSelectedIdsChange(selectedIds.filter((id) => !visibleIds.has(id)));
      return;
    }
    onSelectedIdsChange(
      Array.from(new Set([...selectedIds, ...visibleItems.map((item) => item.id)])),
    );
  };

  const disabled =
    loading ||
    !selectedOption ||
    (mode === 'periodo'
      ? !dateFrom || !dateTo || (period?.invalid ?? false) || period?.count === 0
      : selectedIds.length === 0);

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
          {!hideModoSelector && (
            <div className="inline-flex w-full rounded-lg border border-border bg-muted/30 p-1 text-sm">
              <button
                type="button"
                onClick={() => onModeChange('periodo')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5',
                  mode === 'periodo'
                    ? 'bg-background font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground',
                )}
              >
                <CalendarClock className="h-4 w-4" />
                Por periodo
              </button>
              <button
                type="button"
                onClick={() => onModeChange('seleccion')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5',
                  mode === 'seleccion'
                    ? 'bg-background font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground',
                )}
              >
                <ListChecks className="h-4 w-4" />
                Por {selectionLabel}
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="estado-masivo-select">{optionLabel}</Label>
            {options.length === 0 ? (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                No hay estados manuales disponibles.
              </div>
            ) : (
              <Select value={selectedOption} onValueChange={onSelectedOptionChange}>
                <SelectTrigger id="estado-masivo-select">
                  <SelectValue placeholder="Selecciona un estado..." />
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

          {mode === 'periodo' ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="estado-periodo-desde">Fecha inicio</Label>
                  <Input
                    id="estado-periodo-desde"
                    type="date"
                    value={dateFrom}
                    max={today}
                    onChange={(event) => onDateFromChange(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="estado-periodo-hasta">Fecha fin</Label>
                  <Input
                    id="estado-periodo-hasta"
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    max={today}
                    onChange={(event) => onDateToChange(event.target.value)}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{periodHelp}</div>
              {period && (
                <div
                  className={cn(
                    'rounded-md border p-3 text-sm',
                    period.invalid || period.count === 0
                      ? 'border-warning/30 bg-warning/10 text-warning'
                      : 'border-success/30 bg-success/10 text-success',
                  )}
                >
                  {period.invalid
                    ? 'La fecha de inicio debe ser anterior o igual a la fecha de fin.'
                    : `${period.count} ${selectionLabel} en el periodo.`}
                </div>
              )}
            </div>
          ) : !selectedOption ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Selecciona un estado para ver los {selectionLabel} elegibles.
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
                  disabled={visibleItems.length === 0}
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
                {visibleItems.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No hay elementos que coincidan.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {visibleItems.map((item) => (
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
                )}
              </div>

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
            {loading ? 'Aplicando...' : 'Aplicar estado'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
