import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface ListToolbarProps {
  title: string;
  description?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  debounceMs?: number;
  actions?: React.ReactNode;
  className?: string;
  /**
   * Valor controlado opcional. Si se provee, el ListToolbar sincroniza su
   * estado interno cuando este valor cambia desde el padre (por ejemplo,
   * cuando el padre limpia la búsqueda mediante un botón externo).
   *
   * El input sigue siendo "uncontrolled" para preservar el debounce: el
   * usuario teclea libremente y el padre solo se entera del valor final
   * via `onSearchChange`. Pero si el padre quiere FORZAR un valor (limpiar,
   * presetear desde URL, etc.), pasa `value` y el toolbar se sincroniza.
   */
  value?: string;
}

export function ListToolbar({
  title,
  description,
  searchPlaceholder = 'Buscar...',
  onSearchChange,
  debounceMs = 300,
  actions,
  className,
  value,
}: ListToolbarProps) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const debouncedValue = useDebouncedValue(localValue, debounceMs);

  // Guardamos onSearchChange en una ref para que el efecto de propagación NO
  // dependa de su identidad. Si el padre pasa una función inline, antes esto
  // cancelaba el debounce en cada render y disparaba búsquedas espurias.
  const onSearchChangeRef = useRef(onSearchChange);
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  // Sincroniza el estado interno cuando el padre cambia `value` (p. ej. al
  // limpiar la búsqueda desde un botón fuera del toolbar). Para evitar el
  // típico bucle padre↔hijo, solo actualizamos cuando difiere realmente del
  // valor interno actual.
  useEffect(() => {
    if (value === undefined) return;
    setLocalValue((prev) => (prev === value ? prev : value));
  }, [value]);

  // Evitamos disparar onSearchChange en el primer render (cuando localValue
  // ya es '' por defecto) para no resetear filtros inicializados por el padre.
  const isFirstRunRef = useRef(true);
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    onSearchChangeRef.current?.(debouncedValue);
  }, [debouncedValue]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onSearchChangeRef.current?.('');
  }, []);

  return (
    <div className={cn('flex flex-col gap-4 border-b border-[var(--color-border)] pb-4', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
            {actions}
          </div>
        )}
      </div>
      {onSearchChange && (
        <div className="relative w-full sm:max-w-[360px]">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            strokeWidth={1.75}
          />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className="pl-9 pr-8"
            aria-label={searchPlaceholder}
          />
          {localValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={handleClear}
              aria-label="Limpiar busqueda"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
