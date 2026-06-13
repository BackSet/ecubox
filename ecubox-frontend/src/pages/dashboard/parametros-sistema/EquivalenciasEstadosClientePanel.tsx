import { Info } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/surface-card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  ListTableShell,
} from '@/components/ListTableShell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EstadoGuiaMaster } from '@/types/guia-master';
import {
  ESTADO_GUIA_MASTER_CATALOGO,
  GUIA_MASTER_ESTADO_ORDEN,
} from '@/lib/estados/guiaMasterEstados';

/**
 * Panel administrativo de SOLO LECTURA que muestra la equivalencia entre el
 * estado técnico (`EstadoGuiaMaster`), la etiqueta interna y la etiqueta
 * visible para el cliente. Se deriva por completo del catálogo compartido
 * `@/lib/estados/guiaMasterEstados`; no duplica las equivalencias ni permite
 * editarlas.
 */

/**
 * Mapa código técnico → códigos que comparten su misma etiqueta cliente.
 * Permite anotar la agrupación («parcial/completo» bajo una sola etiqueta).
 */
function construirGrupos(): Map<EstadoGuiaMaster, EstadoGuiaMaster[]> {
  const porEtiquetaCliente = new Map<string, EstadoGuiaMaster[]>();
  for (const estado of GUIA_MASTER_ESTADO_ORDEN) {
    const etiqueta = ESTADO_GUIA_MASTER_CATALOGO[estado].etiquetaCliente;
    const lista = porEtiquetaCliente.get(etiqueta) ?? [];
    lista.push(estado);
    porEtiquetaCliente.set(etiqueta, lista);
  }
  const grupos = new Map<EstadoGuiaMaster, EstadoGuiaMaster[]>();
  for (const lista of porEtiquetaCliente.values()) {
    if (lista.length <= 1) continue;
    for (const estado of lista) {
      grupos.set(
        estado,
        lista.filter((e) => e !== estado),
      );
    }
  }
  return grupos;
}

function notaAgrupacion(
  estado: EstadoGuiaMaster,
  grupos: Map<EstadoGuiaMaster, EstadoGuiaMaster[]>,
): string | null {
  const otros = grupos.get(estado);
  if (!otros || otros.length === 0) return null;
  const etiquetaCliente = ESTADO_GUIA_MASTER_CATALOGO[estado].etiquetaCliente;
  const otrosInternos = otros
    .map((e) => `«${ESTADO_GUIA_MASTER_CATALOGO[e].etiquetaInterna}»`)
    .join(', ');
  return `Comparte la etiqueta «${etiquetaCliente}» con ${otrosInternos}; el cliente distingue el avance por las cantidades de paquetes.`;
}

export function EquivalenciasEstadosClientePanel() {
  const grupos = construirGrupos();

  return (
    <SurfaceCard className="space-y-4 p-4" aria-labelledby="equivalencias-estados-cliente-titulo">
      <header className="space-y-1">
        <h2
          id="equivalencias-estados-cliente-titulo"
          className="text-lg font-semibold text-foreground"
        >
          Equivalencias de estados para clientes
        </h2>
        <p className="text-sm text-muted-foreground">
          El sistema conserva estados técnicos para la operación, pero muestra términos más
          simples a los clientes.
        </p>
      </header>

      {/* Desktop: tabla */}
      <ListTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[12rem]">Código técnico</TableHead>
              <TableHead className="w-[12rem]">Etiqueta interna</TableHead>
              <TableHead>Descripción interna</TableHead>
              <TableHead className="w-[12rem]">Etiqueta cliente</TableHead>
              <TableHead>Descripción cliente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {GUIA_MASTER_ESTADO_ORDEN.map((estado) => {
              const def = ESTADO_GUIA_MASTER_CATALOGO[estado];
              const nota = notaAgrupacion(estado, grupos);
              return (
                <TableRow key={estado}>
                  <TableCell className="align-top">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {estado}
                    </code>
                  </TableCell>
                  <TableCell className="align-top font-medium">{def.etiquetaInterna}</TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {def.descripcionInterna}
                  </TableCell>
                  <TableCell className="align-top">
                    <StatusBadge tone={def.tone}>{def.etiquetaCliente}</StatusBadge>
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {def.descripcionCliente}
                    {nota && (
                      <span className="mt-1 flex items-start gap-1 text-xs text-[var(--color-warning)]">
                        <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                        {nota}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ListTableShell>

      {/* Móvil: tarjetas */}
      <ul className="flex flex-col gap-3 md:hidden">
        {GUIA_MASTER_ESTADO_ORDEN.map((estado) => {
          const def = ESTADO_GUIA_MASTER_CATALOGO[estado];
          const nota = notaAgrupacion(estado, grupos);
          return (
            <li
              key={estado}
              className="rounded-md border border-border bg-muted/30 p-3"
            >
              <code className="font-mono text-[11px] text-muted-foreground">{estado}</code>
              <div className="mt-2 grid grid-cols-1 gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Interno
                  </p>
                  <p className="text-sm font-medium">{def.etiquetaInterna}</p>
                  <p className="text-xs text-muted-foreground">{def.descripcionInterna}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Cliente
                  </p>
                  <StatusBadge tone={def.tone}>{def.etiquetaCliente}</StatusBadge>
                  <p className="mt-1 text-xs text-muted-foreground">{def.descripcionCliente}</p>
                </div>
              </div>
              {nota && (
                <p className="mt-2 flex items-start gap-1 text-xs text-[var(--color-warning)]">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  {nota}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </SurfaceCard>
  );
}
