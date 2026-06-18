import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, ChevronRight, Package as PackageIcon } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { StatusBadge, getRastreoStatusTone } from '@/components/ui/StatusBadge';
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

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="flex flex-col items-start gap-1 text-left hover:opacity-85 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 rounded-sm p-1 -m-1"
          aria-label={`Ver resumen de estados para consolidado ${consolidadoId}`}
        >
          {/* Fila 1: Total Paquetes */}
          <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
            <PackageIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {resumen.totalPaquetes} paquete{resumen.totalPaquetes === 1 ? '' : 's'}
            </span>
          </span>

          {/* Fila 2: Badges */}
          <div className="flex flex-wrap items-center gap-1">
            {visibleEstados.map((item, idx) => {
              const tone = item.requiereAtencion
                ? 'warning'
                : getRastreoStatusTone(item.tipoFlujo as any);
              return (
                <StatusBadge key={idx} tone={tone} className="truncate max-w-[120px]">
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

          {/* Fila 3: Atención */}
          {resumen.cantidadRequiereAtencion > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-warning)]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                {resumen.cantidadRequiereAtencion} requiere{resumen.cantidadRequiereAtencion === 1 ? '' : 'n'} atención
              </span>
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="center"
          sideOffset={4}
          className="z-[60] w-64 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-popover)] p-3 shadow-md focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground border-b border-[var(--color-border)] pb-1.5 flex items-center justify-between">
              <span>Desglose de estados</span>
              <span className="text-[11px] font-normal">{resumen.totalPaquetes} total</span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {resumen.estados.map((item) => {
                const tone = item.requiereAtencion
                  ? 'warning'
                  : getRastreoStatusTone(item.tipoFlujo as any);
                return (
                  <div key={item.estadoId ?? 'null'} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <StatusBadge tone={tone} className="shrink-0">
                        {item.cantidad}
                      </StatusBadge>
                      <span className="truncate text-foreground font-medium" title={item.nombre}>
                        {item.nombre}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setOpen(false);
                        navigate({
                          to: '/envios-consolidados/$id',
                          params: { id: String(consolidadoId) },
                          search: {
                            estadoPaqueteId: item.estadoId === null ? 'SIN_ESTADO' : item.estadoId,
                          },
                        });
                      }}
                      className="flex items-center gap-0.5 text-xs text-[var(--color-primary)] hover:underline focus:outline-none shrink-0"
                    >
                      <span>Ver</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
