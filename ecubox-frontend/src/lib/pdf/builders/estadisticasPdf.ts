import { jsPDF } from 'jspdf';
import type {
  EstadisticasDashboard,
  EstadisticaSerieMensual,
  PaqueteDemorado,
  PaqueteInconsistente,
  ExcepcionOperativa,
} from '@/types/estadisticas';
import { ECUBOX_PDF_COLORS } from '@/lib/pdf/theme';
import {
  createDocCtx,
  drawDocFooter,
  drawDocHeader,
  drawInlineMetrics,
  drawKpiRow,
  drawSectionTitle,
  drawTable,
  fmtFechaCorta,
  fmtFechaHora,
  fmtMoneda,
  fmtNumero,
  safeStr,
  type ColumnDef,
} from '@/lib/pdf/builders/internal-doc';

/**
 * PDF del reporte de estadísticas operativas: resumen en KPIs, evolución
 * mensual, inventario por estado y el detalle de paquetes demorados. Sigue la
 * identidad visual de los demás documentos internos de ECUBOX.
 */

interface FilaMes {
  etiqueta: string;
  despachos: number;
  paquetes: number;
  pesoLbs: number;
  registrados: number;
}

function combinarMeses(
  despachos: EstadisticaSerieMensual[],
  registros: EstadisticaSerieMensual[],
): FilaMes[] {
  const registradosPorPeriodo = new Map(registros.map((r) => [r.periodo, r.total]));
  return despachos.map((d) => ({
    etiqueta: d.etiqueta,
    despachos: d.total,
    paquetes: d.paquetes,
    pesoLbs: Number(d.pesoLbs ?? 0),
    registrados: registradosPorPeriodo.get(d.periodo) ?? 0,
  }));
}

function proyeccionProximoMes(series: EstadisticaSerieMensual[]): number {
  if (!series.length) return 0;
  const ultimos = series.slice(-3);
  return Math.round(ultimos.reduce((sum, item) => sum + item.total, 0) / ultimos.length);
}

export function buildEstadisticasPdf(data: EstadisticasDashboard): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const ctx = createDocCtx(doc);

  const periodo = `${fmtFechaCorta(data.periodoDesde)} – ${fmtFechaCorta(data.periodoHasta)}`;

  const header = () =>
    drawDocHeader(ctx, {
      titulo: 'Estadísticas operativas',
      subtitulo: 'Reporte de tendencias y alertas de operación',
      codigo: periodo,
      meta: `Generado ${fmtFechaHora(data.generadoEn)}`,
    });

  ctx.onPageBreak = () => {
    header();
  };

  header();

  // ── KPIs del resumen ──
  drawKpiRow(ctx, [
    { label: 'Despachos del período', value: fmtNumero(data.resumen.totalDespachos, 0) },
    { label: 'Paquetes despachados', value: fmtNumero(data.resumen.paquetesDespachados, 0) },
    { label: 'Paquetes registrados', value: fmtNumero(data.resumen.paquetesRegistrados, 0) },
    { label: 'Pendientes', value: fmtNumero(data.resumen.pendientesDespacho, 0) },
    {
      label: 'Demorados',
      value: fmtNumero(data.resumen.demoradosSinDespachar, 0),
      highlight: data.resumen.demoradosSinDespachar > 0,
    },
    { label: 'Peso desp. (lb)', value: fmtNumero(data.resumen.pesoDespachadoLbs, 1) },
    {
      label: 'Tiempo prom. despacho',
      value:
        data.resumen.tiempoPromedioDespachoDias != null
          ? `${fmtNumero(data.resumen.tiempoPromedioDespachoDias, 1)} días`
          : '—',
    },
  ]);

  drawInlineMetrics(ctx, 'Estimación según paquetes registrados', [
    {
      label: 'Margen bruto estimado',
      value: fmtMoneda(data.resumen.margenBruto),
    },
    {
      label: 'Costo de distribución',
      value: fmtMoneda(data.resumen.costoDistribucion),
    },
    {
      label: 'Ingreso neto aproximado',
      value: fmtMoneda(data.resumen.ingresoNetoAproximado),
    },
  ]);

  // ── Proyección del próximo mes (media de los últimos 3 meses) ──
  const tasaDespacho =
    data.resumen.paquetesRegistrados > 0
      ? (data.resumen.paquetesDespachados / data.resumen.paquetesRegistrados) * 100
      : 0;
  drawInlineMetrics(ctx, 'Proyección próx. mes', [
    { label: 'Despachos', value: fmtNumero(proyeccionProximoMes(data.despachosPorMes), 0) },
    { label: 'Registrados', value: fmtNumero(proyeccionProximoMes(data.paquetesRegistradosPorMes), 0) },
    { label: 'Tasa de despacho', value: `${fmtNumero(tasaDespacho, 0)}%` },
  ]);

  if (data.resumen.entregadosSinDespacho > 0) {
    drawInlineMetrics(ctx, 'Alerta de integridad', [
      {
        label: 'Entregados sin despacho',
        value: fmtNumero(data.resumen.entregadosSinDespacho, 0),
      },
      {
        label: 'Acción',
        value: 'Revisar trazabilidad',
      },
    ]);
  }

  if (data.resumen.excepcionesOperativas > 0) {
    drawInlineMetrics(ctx, 'Excepciones del sistema', [
      {
        label: 'Total detectado',
        value: fmtNumero(data.resumen.excepcionesOperativas, 0),
      },
      {
        label: 'Prioridad',
        value: 'Revisión operativa',
      },
    ]);
  }

  // ── Evolución mensual ──
  const meses = combinarMeses(data.despachosPorMes, data.paquetesRegistradosPorMes);
  drawSectionTitle(ctx, 'Evolución mensual');
  const mesCols: ColumnDef<FilaMes>[] = [
    { key: 'mes', label: 'MES', weight: 0.2, align: 'left', render: (r) => r.etiqueta },
    { key: 'desp', label: 'DESPACHOS', weight: 0.2, align: 'right', render: (r) => fmtNumero(r.despachos, 0) },
    { key: 'paq', label: 'PAQUETES DESP.', weight: 0.22, align: 'right', render: (r) => fmtNumero(r.paquetes, 0) },
    { key: 'reg', label: 'REGISTRADOS', weight: 0.2, align: 'right', render: (r) => fmtNumero(r.registrados, 0) },
    { key: 'peso', label: 'PESO (LB)', weight: 0.18, align: 'right', render: (r) => fmtNumero(r.pesoLbs, 1) },
  ];
  drawTable<FilaMes>(ctx, {
    columns: mesCols,
    rows: meses,
    empty: 'Sin actividad en el período.',
  });

  // ── Inventario por estado ──
  drawSectionTitle(ctx, 'Inventario por estado');
  const estadoCols: ColumnDef<EstadisticasDashboard['paquetesPorEstado'][number]>[] = [
    { key: 'estado', label: 'ESTADO', weight: 0.55, align: 'left', render: (r) => safeStr(r.nombre) },
    { key: 'codigo', label: 'CÓDIGO', weight: 0.25, align: 'left', render: (r) => safeStr(r.codigo), mono: true },
    { key: 'total', label: 'PAQUETES', weight: 0.2, align: 'right', render: (r) => fmtNumero(r.total, 0) },
  ];
  drawTable(ctx, {
    columns: estadoCols,
    rows: data.paquetesPorEstado,
    empty: 'Sin paquetes registrados.',
  });

  // ── Paquetes demorados ──
  drawSectionTitle(
    ctx,
    `Paquetes demorados sin despacho (> ${data.diasMaxSinDespachar} días laborables)`,
  );
  const demoradoCols: ColumnDef<PaqueteDemorado>[] = [
    { key: 'idx', label: '#', weight: 0.04, align: 'center', render: (_, i) => String(i + 1) },
    { key: 'guia', label: 'GUÍA', weight: 0.16, align: 'left', render: (r) => safeStr(r.numeroGuia), mono: true },
    { key: 'ref', label: 'REFERENCIA', weight: 0.12, align: 'left', render: (r) => safeStr(r.referencia), mono: true },
    { key: 'master', label: 'GUÍA MASTER', weight: 0.14, align: 'left', render: (r) => safeStr(r.guiaMaster), mono: true },
    { key: 'cons', label: 'CONSIGNATARIO', weight: 0.2, align: 'left', render: (r) => safeStr(r.consignatario) },
    { key: 'estado', label: 'ESTADO', weight: 0.14, align: 'left', render: (r) => safeStr(r.estado) },
    { key: 'reg', label: 'REGISTRADO', weight: 0.1, align: 'left', render: (r) => fmtFechaCorta(r.registradoEn) },
    { key: 'dias', label: 'DÍAS LAB.', weight: 0.05, align: 'right', render: (r) => String(r.diasSinDespachar) },
    { key: 'atraso', label: 'ATRASO LAB.', weight: 0.05, align: 'right', render: (r) => `+${r.diasAtraso}` },
  ];
  drawTable<PaqueteDemorado>(ctx, {
    columns: demoradoCols,
    rows: data.paquetesDemorados,
    empty: 'No hay paquetes que superen el tiempo estimado sin despacho.',
  });

  if (data.resumen.demoradosSinDespachar > data.paquetesDemorados.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...ECUBOX_PDF_COLORS.muted);
    doc.text(
      `Se muestran los ${data.paquetesDemorados.length} casos más antiguos de ${data.resumen.demoradosSinDespachar}.`,
      ctx.margin,
      ctx.y + 4,
    );
    ctx.y += 8;
  }

  if (data.resumen.entregadosSinDespacho > 0) {
    drawSectionTitle(ctx, 'Entregados sin despacho registrado');
    const inconsistenteCols: ColumnDef<PaqueteInconsistente>[] = [
      { key: 'idx', label: '#', weight: 0.05, align: 'center', render: (_, i) => String(i + 1) },
      { key: 'guia', label: 'GUÍA', weight: 0.2, align: 'left', render: (r) => safeStr(r.numeroGuia), mono: true },
      { key: 'ref', label: 'REFERENCIA', weight: 0.14, align: 'left', render: (r) => safeStr(r.referencia), mono: true },
      { key: 'master', label: 'GUÍA MASTER', weight: 0.18, align: 'left', render: (r) => safeStr(r.guiaMaster), mono: true },
      { key: 'cons', label: 'CONSIGNATARIO', weight: 0.22, align: 'left', render: (r) => safeStr(r.consignatario) },
      { key: 'estado', label: 'ESTADO FINAL', weight: 0.14, align: 'left', render: (r) => safeStr(r.estado) },
      { key: 'reg', label: 'REGISTRADO', weight: 0.1, align: 'left', render: (r) => fmtFechaCorta(r.registradoEn) },
    ];
    drawTable<PaqueteInconsistente>(ctx, {
      columns: inconsistenteCols,
      rows: data.paquetesEntregadosSinDespacho,
      empty: 'No hay inconsistencias de entrega sin despacho.',
    });
  }

  if (data.resumen.excepcionesOperativas > 0) {
    drawSectionTitle(ctx, 'Excepciones operativas y de integridad');
    const excepcionCols: ColumnDef<ExcepcionOperativa>[] = [
      { key: 'sev', label: 'SEV.', weight: 0.07, align: 'center', render: (r) => r.severidad },
      { key: 'mod', label: 'MÓDULO', weight: 0.14, align: 'left', render: (r) => safeStr(r.modulo) },
      { key: 'ref', label: 'REFERENCIA', weight: 0.15, align: 'left', render: (r) => safeStr(r.referencia), mono: true },
      { key: 'exc', label: 'EXCEPCIÓN', weight: 0.24, align: 'left', render: (r) => safeStr(r.titulo) },
      { key: 'det', label: 'DETALLE', weight: 0.4, align: 'left', render: (r) => safeStr(r.detalle) },
    ];
    drawTable<ExcepcionOperativa>(ctx, {
      columns: excepcionCols,
      rows: data.excepcionesOperativas,
      empty: 'No se detectaron otras excepciones.',
    });
  }

  drawDocFooter(doc, {
    left: `ECUBOX · Estadísticas ${periodo} · Generado ${new Date().toLocaleString('es-EC', {
      dateStyle: 'short',
      timeStyle: 'short',
    })}`,
  });
  return doc;
}
