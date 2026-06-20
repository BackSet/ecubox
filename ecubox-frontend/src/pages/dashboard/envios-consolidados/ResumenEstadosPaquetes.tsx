import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, ChevronRight, Package as PackageIcon } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { StatusBadge, getRastreoStatusTone } from '@/components/ui/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ResumenEstadosPaquetesConsolidado } from '@/types/envio-consolidado';

export interface ResumenEstadosPaquetesProps {
  consolidadoId: number;
  resumen?: ResumenEstadosPaquetesConsolidado;
}

export function ResumenEstadosPaquetes({
  consolidadoId,
  resumen,
}: ResumenEstadosPaquetesProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (!resumen || resumen.totalPaquetes === 0) {
    return (
      <div className="flex flex-col items-start gap-1 py-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <PackageIcon className="h-3.5 w-3.5" />
          <span>0 paquetes</span>
        </span>
      </div>
    );
  }

  // Obtener los primeros dos estados ordenados para mostrar como badges principales
  const visibleEstados = resumen.estados.slice(0, 2);

  // Sumar las cantidades de los estados restantes (del índice 2 en adelante)
  const restanteCantidad = resumen.estados.slice(2).reduce((sum, item) => sum + item.cantidad, 0);

  const trigger = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}
      className="ui-transition -m-1 flex flex-col items-start gap-1 rounded-sm p-1 text-left hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
      aria-label={`Ver desglose de estados para consolidado ${consolidadoId}`}
    >
      <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
        <PackageIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span>
          {resumen.totalPaquetes} paquete{resumen.totalPaquetes === 1 ? '' : 's'}
        </span>
      </span>

      <div className="flex flex-wrap items-center gap-1">
        {visibleEstados.map((item, idx) => {
          const tone = item.requiereAtencion
            ? 'warning'
            : getRastreoStatusTone(item.tipoFlujo as any);
          return (
            <StatusBadge key={idx} tone={tone} className="max-w-[120px] truncate">
              {item.cantidad} {item.nombre}
            </StatusBadge>
          );
        })}
        {restanteCantidad > 0 && (
          <StatusBadge tone="neutral" className="font-semibold">
            +{restanteCantidad}
          </StatusBadge>
        )}
      </div>

      {resumen.cantidadRequiereAtencion > 0 && (
        <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-warning)]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {resumen.cantidadRequiereAtencion} requiere{resumen.cantidadRequiereAtencion === 1 ? '' : 'n'} atención
          </span>
        </span>
      )}
    </button>
  );

  const content = (
    <ResumenEstadosContent
      consolidadoId={consolidadoId}
      resumen={resumen}
      onNavigate={(item) => {
        setOpen(false);
        navigate({
          to: '/envios-consolidados/$id',
          params: { id: String(consolidadoId) },
          search: item.estadoId === null
            ? { sinEstado: true }
            : { estadoPaqueteId: item.estadoId },
        });
      }}
    />
  );

  if (!isDesktop) {
    return (
      <>
        {trigger}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-md flex-col overflow-hidden p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader className="shrink-0 border-b border-border px-4 pb-3 pt-5">
              <DialogTitle>Desglose de estados</DialogTitle>
              <DialogDescription>
                {resumen.totalPaquetes} paquete{resumen.totalPaquetes === 1 ? '' : 's'} agrupado{resumen.totalPaquetes === 1 ? '' : 's'} por estado.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {content}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="center"
          sideOffset={4}
          className="z-[60] max-h-[min(32rem,calc(100dvh-2rem))] w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-popover)] p-0 shadow-md focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>Desglose de estados</span>
              <span className="text-[11px] font-normal">{resumen.totalPaquetes} total</span>
            </div>
          </div>
          <div className="max-h-[26rem] overflow-y-auto p-3">
            {content}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

type EstadoResumenItem = ResumenEstadosPaquetesConsolidado['estados'][number];

function ResumenEstadosContent({
  resumen,
  onNavigate,
}: {
  consolidadoId: number;
  resumen: ResumenEstadosPaquetesConsolidado;
  onNavigate: (item: EstadoResumenItem) => void;
}) {
  return (
    <div className="space-y-3">
      {resumen.estados.map((item) => {
        const tone = item.requiereAtencion
          ? 'warning'
          : getRastreoStatusTone(item.tipoFlujo as any);
        const preview = item.paquetesPreview ?? [];
        const restantes = Math.max(item.cantidad - preview.length, 0);
        return (
          <section
            key={item.estadoId ?? 'sin-estado'}
            className="rounded-md border border-border bg-[var(--color-muted)]/10 px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground" title={item.nombre}>
                  {item.nombre} · {item.cantidad} paquete{item.cantidad === 1 ? '' : 's'}
                </h3>
                {item.requiereAtencion && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-warning)]">
                    <AlertTriangle className="h-3 w-3" />
                    Requiere atención
                  </p>
                )}
              </div>
              <StatusBadge tone={tone} className="shrink-0">
                {item.cantidad}
              </StatusBadge>
            </div>

            {preview.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {preview.map((paquete) => (
                  <li key={paquete.paqueteId} className="min-w-0 text-xs">
                    <p className="truncate font-mono font-medium text-foreground" title={paquete.codigo}>
                      {abreviarCodigo(paquete.codigo)}
                      {paquete.piezaLabel && (
                        <span className="ml-1 font-sans text-[11px] text-muted-foreground">
                          Pieza {paquete.piezaLabel}
                        </span>
                      )}
                    </p>
                    {paquete.guiaCodigo && (
                      <p className="truncate text-[11px] text-muted-foreground" title={paquete.guiaCodigo}>
                        Guía {abreviarCodigo(paquete.guiaCodigo)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Sin muestra de paquetes disponible.
              </p>
            )}

            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                onNavigate(item);
              }}
              className="ui-transition mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
              aria-label={`Ver paquetes de ${item.nombre}`}
            >
              <span>{item.hayMas && restantes > 0 ? `Ver ${restantes} más` : 'Ver paquetes'}</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </section>
        );
      })}
    </div>
  );
}

function abreviarCodigo(codigo: string | null | undefined) {
  const value = (codigo ?? '').trim();
  if (value.length <= 18) return value;
  return `${value.slice(0, 7)}...${value.slice(-6)}`;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    listener();
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
