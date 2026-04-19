import { useCallback, useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ListToolbarProps {
  title: string;
  description?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  debounceMs?: number;
  actions?: React.ReactNode;
  className?: string;
}

export function ListToolbar({
  title,
  description,
  searchPlaceholder = 'Buscar...',
  onSearchChange,
  debounceMs = 300,
  actions,
  className,
}: ListToolbarProps) {
  const [localValue, setLocalValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!onSearchChange) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(localValue);
      debounceRef.current = null;
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localValue, debounceMs, onSearchChange]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onSearchChange?.('');
  }, [onSearchChange]);

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
