import { useState, type ReactNode } from 'react';
import {
  Boxes,
  Check,
  HelpCircle,
  PackageSearch,
  Receipt,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  EjemploTiendaTracking,
  GUIA_TRACKING_DATOS_CORRECTOS,
  GUIA_TRACKING_DATOS_INCORRECTOS,
  GUIA_TRACKING_DONDE_APARECE,
  GUIA_TRACKING_EJEMPLOS,
  GUIA_TRACKING_MENSAJE_DIVIDIDO,
  GUIA_TRACKING_MENSAJE_PRINCIPAL,
} from './guiaTrackingHelpContent';

/**
 * Ayuda reutilizable que enseña al cliente a identificar el número de guía o
 * rastreo de su paquete. El contenido vive en `guiaTrackingHelpContent` para
 * no duplicarlo entre la página `Mis guías` y el diálogo `Registrar guías`.
 *
 * Variantes:
 * - `detalle`: contenido completo (qué es, pedido vs guía, dónde aparece,
 *   compra dividida, ejemplos Amazon/SHEIN). Se renderiza inline o dentro de un
 *   diálogo.
 * - `resumen`: tarjeta compacta con el mensaje principal y un botón
 *   «Ver ejemplos» que abre el detalle en un diálogo.
 * - `inline`: disparador discreto «¿No sabes cuál número ingresar?» que abre el
 *   mismo detalle (pensado para usarse dentro de otro formulario/diálogo).
 *
 * Los códigos de ejemplo son ficticios; las marcas son ilustrativas.
 */
export type GuiaTrackingHelpVariant = 'resumen' | 'detalle' | 'inline';

interface GuiaTrackingHelpProps {
  variant: GuiaTrackingHelpVariant;
  className?: string;
}

export function GuiaTrackingHelp({ variant, className }: GuiaTrackingHelpProps) {
  if (variant === 'detalle') {
    return <GuiaTrackingHelpDetalle className={className} />;
  }
  if (variant === 'inline') {
    return (
      <GuiaTrackingHelpDialog
        trigger={
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40',
              className,
            )}
          >
            <HelpCircle className="h-4 w-4" aria-hidden />
            ¿No sabes cuál número ingresar?
          </button>
        }
      />
    );
  }
  // resumen
  return (
    <SurfaceCard className={cn('space-y-3 p-4', className)}>
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
          aria-hidden
        >
          <PackageSearch className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            ¿Cómo encuentro el número de guía?
          </h3>
          <p className="text-sm text-muted-foreground">{GUIA_TRACKING_MENSAJE_PRINCIPAL}</p>
        </div>
      </div>
      <GuiaTrackingHelpDialog
        trigger={
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">
            <HelpCircle className="mr-1.5 h-4 w-4" />
            Ver ejemplos
          </Button>
        }
      />
    </SurfaceCard>
  );
}

/**
 * Diálogo que muestra el contenido detallado. El disparador se pasa como
 * `trigger` (Radix `DialogTrigger asChild`), lo que conserva el foco, funciona
 * con teclado y, al anidarse dentro de otro diálogo, no cierra el formulario
 * padre ni pierde los datos ya escritos.
 */
export function GuiaTrackingHelpDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>¿Cómo encuentro el número de guía?</DialogTitle>
          <DialogDescription>
            Aprende a identificar el número de rastreo de tu paquete y a diferenciarlo del número
            de pedido.
          </DialogDescription>
        </DialogHeader>
        <GuiaTrackingHelpDetalle />
      </DialogContent>
    </Dialog>
  );
}

/** Bloque de código ficticio: no desborda en móvil (break-all + mono). */
function CodigoEjemplo({ children, tone }: { children: ReactNode; tone: 'ok' | 'bad' }) {
  return (
    <code
      className={cn(
        'block w-full break-all rounded border px-2 py-1 font-mono text-xs',
        tone === 'ok'
          ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-foreground'
          : 'border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 text-muted-foreground line-through',
      )}
    >
      {children}
    </code>
  );
}

function TiendaMock({ ejemplo }: { ejemplo: EjemploTiendaTracking }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--color-muted)]/20 p-3">
      {/* Mockup propio: nombre de la tienda con icono genérico, sin logos de terceros. */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded bg-[var(--color-muted)] text-muted-foreground"
          aria-hidden
        >
          <Store className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-semibold text-foreground">{ejemplo.tienda}</span>
        <span className="text-[11px] text-muted-foreground">(ejemplo)</span>
      </div>

      <ol className="mb-3 ml-4 list-decimal space-y-0.5 text-sm text-muted-foreground">
        {ejemplo.pasos.map((paso) => (
          <li key={paso}>{paso}</li>
        ))}
      </ol>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-success)]">
          Esto sí es la guía
        </p>
        {ejemplo.ejemplosCorrectos.map((c) => (
          <CodigoEjemplo key={c} tone="ok">
            {c}
          </CodigoEjemplo>
        ))}
        <p className="pt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-destructive)]">
          Esto no es la guía · {ejemplo.ejemploIncorrecto.etiqueta}
        </p>
        <CodigoEjemplo tone="bad">{ejemplo.ejemploIncorrecto.valor}</CodigoEjemplo>
      </div>

      <p className="mt-2 text-[11px] italic text-muted-foreground">{ejemplo.nota}</p>
    </div>
  );
}

function GuiaTrackingHelpDetalle({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Mensaje principal */}
      <div className="flex items-start gap-2 rounded-md border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-3 text-sm text-foreground">
        <PackageSearch className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" aria-hidden />
        <p>{GUIA_TRACKING_MENSAJE_PRINCIPAL}</p>
      </div>

      {/* Pedido vs guía */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Check className="h-4 w-4 text-[var(--color-success)]" aria-hidden />
            Esto sí es la guía
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {GUIA_TRACKING_DATOS_CORRECTOS.map((d) => (
              <li key={d} className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-success)]" aria-hidden />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <X className="h-4 w-4 text-[var(--color-destructive)]" aria-hidden />
            Esto no es la guía
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {GUIA_TRACKING_DATOS_INCORRECTOS.map((d) => (
              <li key={d} className="flex items-start gap-1.5">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-destructive)]" aria-hidden />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dónde aparece */}
      <div className="rounded-lg border border-border p-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden />
          ¿Dónde suele aparecer?
        </p>
        <ul className="ml-4 list-disc space-y-0.5 text-sm text-muted-foreground">
          {GUIA_TRACKING_DONDE_APARECE.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>

      {/* Compra dividida */}
      <div className="flex items-start gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-sm text-foreground">
        <Boxes className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden />
        <p>{GUIA_TRACKING_MENSAJE_DIVIDIDO}</p>
      </div>

      {/* Ejemplos por tienda */}
      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Truck className="h-4 w-4 text-muted-foreground" aria-hidden />
          Ejemplos por tienda
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GUIA_TRACKING_EJEMPLOS.map((ej) => (
            <TiendaMock key={ej.tienda} ejemplo={ej} />
          ))}
        </div>
      </div>
    </div>
  );
}
