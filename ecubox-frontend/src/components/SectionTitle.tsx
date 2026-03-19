import { cn } from '@/lib/utils';

interface SectionTitleProps {
  children: React.ReactNode;
  variant?: 'detail' | 'form';
  className?: string;
}

/**
 * Título de sección: variante "detail" (pequeño, mayúsculas, tracking, muted) o "form" (más grande, borde inferior).
 */
export function SectionTitle({
  children,
  variant = 'detail',
  className,
}: SectionTitleProps) {
  if (variant === 'form') {
    return (
      <h3
        className={cn(
          'text-base font-semibold text-[var(--color-foreground)] border-b border-[var(--color-border)] pb-2 mb-3',
          className
        )}
      >
        {children}
      </h3>
    );
  }
  return (
    <h3
      className={cn(
        'text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]',
        className
      )}
    >
      {children}
    </h3>
  );
}
