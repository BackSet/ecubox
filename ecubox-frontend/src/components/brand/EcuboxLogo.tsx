import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import logoLight from '@/assets/brand/ecubox-logo-light.svg';
import logoDark from '@/assets/brand/ecubox-logo-dark.svg';
import markLight from '@/assets/brand/ecubox-mark-light.svg';
import markDark from '@/assets/brand/ecubox-mark-dark.svg';

export type EcuboxLogoVariant = 'principal' | 'gradient' | 'purple' | 'light' | 'onPurple';
export type EcuboxLogoSize = 'sm' | 'md' | 'lg';
const SIZE_CLASSES: Record<EcuboxLogoSize, { icon: string; wordmark: string }> = {
  sm: { icon: 'h-6 w-6', wordmark: 'h-6' },
  md: { icon: 'h-8 w-8', wordmark: 'h-8' },
  lg: { icon: 'h-10 w-10', wordmark: 'h-10' },
};

export interface EcuboxLogoProps {
  variant?: EcuboxLogoVariant;
  size?: EcuboxLogoSize;
  className?: string;
  asLink?: boolean;
  linkTo?: string;
  /** Solo muestra el isotipo, sin wordmark (p. ej. sidebar colapsado) */
  iconOnly?: boolean;
}

export function EcuboxLogo({
  variant = 'principal',
  size = 'md',
  className,
  asLink = true,
  linkTo = '/',
  iconOnly = false,
}: EcuboxLogoProps) {
  const sizes = SIZE_CLASSES[size];
  const lightSrc = iconOnly ? markLight : logoLight;
  const darkSrc = iconOnly ? markDark : logoDark;
  const forceLightAsset = variant === 'onPurple';
  const baseClass = iconOnly ? sizes.icon : cn(sizes.wordmark, 'w-auto');

  const content = forceLightAsset ? (
    <span className={cn('inline-flex items-center', className)} aria-label="ECUBOX">
      <img src={lightSrc} alt="ECUBOX" className={baseClass} />
    </span>
  ) : (
    <span className={cn('inline-flex items-center', className)} aria-label="ECUBOX">
      <img src={lightSrc} alt="ECUBOX" className={cn(baseClass, 'dark:hidden')} />
      <img src={darkSrc} alt="ECUBOX" className={cn(baseClass, 'hidden dark:block')} />
    </span>
  );

  if (asLink) {
    return (
      <Link to={linkTo} className="flex-shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
