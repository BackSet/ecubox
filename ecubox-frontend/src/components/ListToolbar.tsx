import { useCallback, useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';

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

  const searchAndActions = (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
      {onSearchChange && (
        <div className="relative w-full sm:flex-1 lg:max-w-[320px]">
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
              aria-label="Limpiar busqueda"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      {actions}
    </div>
  );

  return (
    <PageHeader
      title={title}
      description={description}
      actions={searchAndActions}
      variant="list"
      className={cn(className)}
    />
  );
}
