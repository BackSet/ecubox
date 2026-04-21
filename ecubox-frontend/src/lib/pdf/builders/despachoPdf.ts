import { jsPDF } from 'jspdf';
import type { Despacho, Saca, TamanioSaca } from '@/types/despacho';
import type { Paquete } from '@/types/paquete';
import { lbsToKg } from '@/lib/utils/weight';
import { ECUBOX_PDF_COLORS } from '@/lib/pdf/theme';
import {
  createDocCtx,
  drawDocFooter,
  drawDocHeader,
  drawFirmas,
  drawKpiRow,
  drawMetaRow,
  drawSectionTitle,
  drawTable,
  drawTotalBar,
  fmtFechaHora,
  fmtNumero,
  safeStr,
  type ColumnDef,
} from '@/lib/pdf/builders/internal-doc';

/**
 * Construye el PDF del documento de despacho con la identidad visual de
 * ECUBOX. Los paquetes de cada saca se renderizan como una sola tabla con
 * cabeceras de grupo (saca) repetidas; la cabecera principal se repite en
 * cada salto de página gracias al `onPageBreak` del contexto.
 */

const TAMANIO_LABELS: Record<TamanioSaca, string> = {
  INDIVIDUAL: 'Paquete individual',
  PEQUENO: 'Saca pequeña',
  MEDIANO: 'Saca mediana',
  GRANDE: 'Saca grande',
};

const TIPO_LABELS: Record<string, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_COURIER_ENTREGA: 'Punto de entrega',
};

interface PaqueteRow {
  paquete: Paquete;
  saca: Saca;
  sacaIdx: number;
  globalIdx: number;
}

function destinoFor(d: Despacho): {
  titulo: string;
  nombre: string;
  direccion: string;
  telefono: string;
} {
  if (d.tipoEntrega === 'DOMICILIO') {
    return {
      titulo: 'Entrega a domicilio',
      nombre: safeStr(d.consignatarioNombre),
      direccion: safeStr(d.consignatarioDireccion),
      telefono: safeStr(d.consignatarioTelefono),
    };
  }
  if (d.tipoEntrega === 'AGENCIA_COURIER_ENTREGA') {
    return {
      titulo: 'Entrega en punto',
      nombre: safeStr(d.agenciaCourierEntregaNombre),
      direccion: safeStr(d.agenciaCourierEntregaNombre),
      telefono: '-',
    };
  }
  return {
    titulo: 'Entrega en agencia',
    nombre: safeStr(d.agenciaNombre),
    direccion: safeStr(d.agenciaNombre),
    telefono: '-',
  };
}

function totalesGenerales(sacas: Saca[]): {
  paquetes: number;
  pesoLbs: number;
  pesoKg: number;
} {
  let paquetes = 0;
  let pesoLbs = 0;
  let pesoKg = 0;
  for (const s of sacas) {
    const ps = s.paquetes ?? [];
    paquetes += ps.length;
    for (const p of ps) {
      const lbs = Number(p.pesoLbs ?? 0);
      const kg = Number(p.pesoKg ?? (Number.isFinite(lbs) ? lbsToKg(lbs) : 0));
      if (Number.isFinite(lbs)) pesoLbs += lbs;
      if (Number.isFinite(kg)) pesoKg += kg;
    }
  }
  return {
    paquetes,
    pesoLbs: Math.round(pesoLbs * 100) / 100,
    pesoKg: Math.round(pesoKg * 100) / 100,
  };
}

function flattenPaquetes(sacas: Saca[]): PaqueteRow[] {
  const out: PaqueteRow[] = [];
  let global = 0;
  sacas.forEach((saca, sacaIdx) => {
    (saca.paquetes ?? []).forEach((paquete) => {
      out.push({ paquete, saca, sacaIdx, globalIdx: global++ });
    });
  });
  return out;
}

export function buildDespachoPdf(despacho: Despacho): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const ctx = createDocCtx(doc);

  const sacas = despacho.sacas ?? [];
  const totales = totalesGenerales(sacas);
  const destino = destinoFor(despacho);
  const numeroGuia = safeStr(despacho.numeroGuia, `#${despacho.id}`);

  const header = () =>
    drawDocHeader(ctx, {
      titulo: 'Documento de despacho',
      subtitulo: 'Hoja operativa de logística',
      codigo: numeroGuia,
      meta: `ID ${despacho.id} · ${fmtFechaHora(despacho.fechaHora)}`,
    });

  ctx.onPageBreak = () => {
    header();
  };

  header();

  // Bloques de información general
  drawMetaRow(ctx, [
    {
      titulo: 'Despacho',
      filas: [
        { label: 'Guía', value: numeroGuia, bold: true },
        { label: 'Fecha', value: fmtFechaHora(despacho.fechaHora) },
        { label: 'Operario', value: safeStr(despacho.operarioNombre) },
      ],
    },
    {
      titulo: 'Distribución',
      filas: [
        {
          label: 'Courier de entrega',
          value: safeStr(despacho.courierEntregaNombre),
          bold: true,
        },
        {
          label: 'Tipo de entrega',
          value: TIPO_LABELS[despacho.tipoEntrega] ?? despacho.tipoEntrega,
        },
        { label: 'Código precinto', value: safeStr(despacho.codigoPrecinto) },
      ],
    },
    {
      titulo: destino.titulo,
      filas: [
        { label: 'Destino', value: destino.nombre, bold: true },
        { label: 'Dirección', value: destino.direccion },
        { label: 'Teléfono', value: destino.telefono },
      ],
    },
  ]);

  // KPIs
  drawKpiRow(ctx, [
    { label: 'Sacas', value: String(sacas.length) },
    { label: 'Paquetes', value: String(totales.paquetes) },
    { label: 'Peso total (lbs)', value: fmtNumero(totales.pesoLbs) },
    { label: 'Peso total (kg)', value: fmtNumero(totales.pesoKg), highlight: true },
  ]);

  drawSectionTitle(ctx, 'Detalle de paquetes por saca');

  if (sacas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...ECUBOX_PDF_COLORS.muted);
    doc.text('Este despacho no tiene sacas asignadas.', ctx.margin, ctx.y + 5);
    drawDocFooter(doc, {
      left: `ECUBOX · Despacho ${numeroGuia} · Generado ${new Date().toLocaleString(
        'es-EC',
        { dateStyle: 'short', timeStyle: 'short' },
      )}`,
    });
    return doc;
  }

  const rows = flattenPaquetes(sacas);

  const columns: ColumnDef<PaqueteRow>[] = [
    {
      key: 'idx',
      label: '#',
      weight: 0.04,
      align: 'center',
      render: (_, i) => String(i + 1),
    },
    {
      key: 'guia',
      label: 'GUÍA',
      weight: 0.13,
      align: 'left',
      render: (r) => safeStr(r.paquete.numeroGuia),
      mono: true,
    },
    {
      key: 'pieza',
      label: 'PIEZA',
      weight: 0.05,
      align: 'center',
      render: (r) =>
        r.paquete.piezaNumero != null && r.paquete.piezaTotal != null
          ? `${r.paquete.piezaNumero}/${r.paquete.piezaTotal}`
          : '-',
    },
    {
      key: 'consignatario',
      label: 'CONSIGNATARIO',
      weight: 0.18,
      align: 'left',
      render: (r) => safeStr(r.paquete.consignatarioNombre),
    },
    {
      key: 'telefono',
      label: 'TELÉFONO',
      weight: 0.09,
      align: 'left',
      render: (r) => safeStr(r.paquete.consignatarioTelefono),
    },
    {
      key: 'ubicacion',
      label: 'UBICACIÓN',
      weight: 0.22,
      align: 'left',
      render: (r) => {
        const dir = safeStr(r.paquete.consignatarioDireccion);
        const cp = [r.paquete.consignatarioCanton, r.paquete.consignatarioProvincia]
          .filter(Boolean)
          .join(', ');
        const parts = [dir !== '-' ? dir : null, cp || null].filter(Boolean);
        return parts.length > 0 ? parts.join(' · ') : '-';
      },
    },
    {
      key: 'contenido',
      label: 'CONTENIDO',
      weight: 0.16,
      align: 'left',
      render: (r) => safeStr(r.paquete.contenido),
    },
    {
      key: 'peso',
      label: 'PESO',
      weight: 0.13,
      align: 'right',
      render: (r) => {
        const lbs = Number(r.paquete.pesoLbs ?? 0);
        const kg = Number(
          r.paquete.pesoKg ?? (Number.isFinite(lbs) ? lbsToKg(lbs) : 0),
        );
        return `${fmtNumero(lbs)} lbs / ${fmtNumero(kg)} kg`;
      },
    },
  ];

  drawTable<PaqueteRow>(ctx, {
    columns,
    rows,
    empty: 'No hay paquetes asignados a este despacho.',
    groupHeader: ({ row }) => {
      const ps = row.saca.paquetes ?? [];
      const lbs = ps.reduce((s, p) => s + Number(p.pesoLbs ?? 0), 0);
      const kg = lbsToKg(lbs);
      const tam = row.saca.tamanio
        ? TAMANIO_LABELS[row.saca.tamanio] ?? row.saca.tamanio
        : 'Sin tamaño';
      return `Saca #${row.sacaIdx + 1}  ·  ${safeStr(row.saca.numeroOrden)}  ·  ${tam}  ·  ${ps.length} paquete${ps.length === 1 ? '' : 's'}  ·  ${fmtNumero(lbs)} lbs / ${fmtNumero(kg)} kg`;
    },
  });

  drawTotalBar(ctx, {
    left: `TOTAL DESPACHO · ${sacas.length} saca${sacas.length === 1 ? '' : 's'} · ${totales.paquetes} paquete${totales.paquetes === 1 ? '' : 's'}`,
    right: `${fmtNumero(totales.pesoLbs)} lbs  /  ${fmtNumero(totales.pesoKg)} kg`,
  });

  drawFirmas(ctx, [
    { titulo: 'Entrega', subtitulo: safeStr(despacho.operarioNombre) },
    { titulo: 'Recibe', subtitulo: safeStr(despacho.courierEntregaNombre) },
  ]);

  drawDocFooter(doc, {
    left: `ECUBOX · Despacho ${numeroGuia} · Generado ${new Date().toLocaleString(
      'es-EC',
      { dateStyle: 'short', timeStyle: 'short' },
    )}`,
  });
  return doc;
}
