import { useCallback, useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SurfaceCard } from '@/components/ui/surface-card';

interface ListToolbarProps {
  title: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  debounceMs?: number;
  actions?: React.ReactNode;
  className?: string;
}

export function ListToolbar({
  title,
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
    <SurfaceCard
      className={cn(
        'p-3',
        'flex flex-col gap-3 md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">{title}</h1>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2 md:justify-end">
        {onSearchChange && (
          <div className="relative flex-1 md:max-w-[280px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
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
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        {actions}
      </div>
    </SurfaceCard>
  );
}
