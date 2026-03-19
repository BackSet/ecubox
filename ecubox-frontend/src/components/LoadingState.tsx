import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  variant?: 'page' | 'inline';
  text?: string;
  className?: string;
}

export function LoadingState({
  variant = 'page',
  text = 'Cargando...',
  className,
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]',
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
        <span>{text}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12',
        className
      )}
    >
      <Loader2
        className="h-8 w-8 animate-spin text-[var(--color-muted-foreground)]"
        aria-hidden
      />
      <p className="text-sm text-[var(--color-muted-foreground)]">{text}</p>
    </div>
  );
}
