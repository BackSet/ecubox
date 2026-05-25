import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PublicPageHeroProps {
  badge?: string;
  badgeIcon?: LucideIcon;
  title: string;
  description: string;
  icon?: LucideIcon;
  aside?: ReactNode;
  className?: string;
}

export function PublicPageHero({
  badge,
  badgeIcon: BadgeIcon,
  title,
  description,
  icon: Icon,
  aside,
  className,
}: PublicPageHeroProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-[var(--color-landing-border)] pb-6 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="flex min-w-0 gap-3 sm:gap-4">
        {Icon ? (
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-landing-border)] bg-[var(--color-landing-card)] text-[var(--color-primary)] sm:size-11">
            <Icon className="size-5" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0 space-y-2">
          {badge ? (
            <span className="landing-chip inline-flex w-fit items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-primary)]">
              {BadgeIcon ? <BadgeIcon className="size-3" aria-hidden /> : null}
              {badge}
            </span>
          ) : null}
          <h1 className="responsive-title landing-text font-bold tracking-tight">{title}</h1>
          <p className="landing-text-muted max-w-2xl text-sm leading-relaxed sm:text-base">
            {description}
          </p>
        </div>
      </div>
      {aside ? <aside className="shrink-0 sm:max-w-[14rem] sm:pt-1">{aside}</aside> : null}
    </header>
  );
}
