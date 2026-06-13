import { jsPDF } from 'jspdf';
import type {
  EstadisticasDashboard,
  EstadisticaSeriePunto,
  MetricaComparable,
  PaqueteDemorado,
  PaqueteInconsistente,
  ExcepcionOperativa,
} from '@/types/estadisticas';
import { GRANULARIDAD_LABEL } from '@/pages/dashboard/estadisticas/periodo';
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
 * PDF del reporte de estadísticas operativas. Refleja el periodo real (con su
 * periodo anterior equivalente, variaciones y granularidad) y separa los
 * resultados históricos de la fotografía operativa actual.
 */

interface FilaPunto {
  etiqueta: string;
  paquetesDespachados: number;
  pesoLbs: number;
  registrados: number;
}

function combinarSeries(
  paquetesDespachados: EstadisticaSeriePunto[],
  registros: EstadisticaSeriePunto[],
): FilaPunto[] {
  const registradosPorPeriodo = new Map(registros.map((r) => [r.periodo, r.total]));
  return paquetesDespachados.map((d) => ({
    etiqueta: d.etiqueta,
    paquetesDespachados: d.total,
    pesoLbs: Number(d.pesoLbs ?? 0),
    registrados: registradosPorPeriodo.get(d.periodo) ?? 0,
  }));
}

function variacion(metrica: MetricaComparable): string {
  if (!metrica.comparacionDisponible) return 's/ comparación';
  if (metrica.variacionPct == null) {
    const dif = metrica.diferencia ?? 0;
    return `${dif > 0 ? '+' : ''}${fmtNumero(dif, 1)}`;
  }
  const arrow = metrica.variacionPct >= 0 ? '+' : '-';
  return `${arrow}${fmtNumero(Math.abs(metrica.variacionPct), 1)} %`;
}

export function buildEstadisticasPdf(data: EstadisticasDashboard): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const ctx = createDocCtx(doc);
  const { resultados, estadoActual } = data;

  const periodo = `${fmtFechaCorta(data.periodo.desde)} – ${fmtFechaCorta(data.periodo.hastaInclusivo)}`;
  const periodoAnterior = `${fmtFechaCorta(data.periodoAnterior.desde)} – ${fmtFechaCorta(
    data.periodoAnterior.hastaInclusivo,
  )}`;

  const header = () =>
    drawDocHeader(ctx, {
      titulo: 'Estadísticas operativas',
      subtitulo: `Resultados del periodo · Granularidad ${GRANULARIDAD_LABEL[
        data.granularidad
      ].toLowerCase()}${data.periodoParcial ? ' · Período en curso' : ''}`,
      codigo: periodo,
      meta: `Generado ${fmtFechaHora(data.generadoEn)}`,
    });

  ctx.onPageBreak = () => {
    header();
  };

  header();

  drawInlineMetrics(ctx, 'Periodo comparado', [
    { label: 'Periodo', value: periodo },
    { label: 'Periodo anterior', value: periodoAnterior },
    { label: 'Granularidad', value: GRANULARIDAD_LABEL[data.granularidad] },
  ]);

  // ── KPIs de resultados del periodo ──
  drawKpiRow(ctx, [
    {
      label: 'Paquetes despachados',
      value: fmtNumero(resultados.paquetesDespachados.actual ?? 0, 0),
    },
    {
      label: 'Paquetes registrados',
      value: fmtNumero(resultados.paquetesRegistrados.actual ?? 0, 0),
    },
    { label: 'Peso desp. (lbs)', value: fmtNumero(resultados.pesoDespachadoLbs.actual ?? 0, 1) },
    {
      label: 'Tiempo prom. despacho',
      value:
        resultados.tiempoPromedioDespachoDias.actual != null
          ? `${fmtNumero(resultados.tiempoPromedioDespachoDias.actual, 1)} días`
          : '—',
    },
  ]);

  drawInlineMetrics(ctx, 'Variación vs. periodo anterior', [
    { label: 'Paquetes despachados', value: variacion(resultados.paquetesDespachados) },
    { label: 'Paquetes registrados', value: variacion(resultados.paquetesRegistrados) },
    { label: 'Peso despachado', value: variacion(resultados.pesoDespachadoLbs) },
  ]);

  drawInlineMetrics(ctx, 'Estimación financiera del periodo (no contable)', [
    { label: 'Margen bruto est.', value: fmtMoneda(resultados.margenBruto.actual ?? 0) },
    { label: 'Costo distribución est.', value: fmtMoneda(resultados.costoDistribucion.actual ?? 0) },
    { label: 'Ingreso neto est.', value: fmtMoneda(resultados.ingresoNeto.actual ?? 0) },
  ]);

  // ── Movimiento de paquetes ──
  const puntos = combinarSeries(resultados.paquetesDespachadosSerie, resultados.registrosSerie);
  drawSectionTitle(ctx, 'Movimiento de paquetes');
  const puntoCols: ColumnDef<FilaPunto>[] = [
    { key: 'periodo', label: 'PERÍODO', weight: 0.28, align: 'left', render: (r) => r.etiqueta },
    { key: 'paq', label: 'PAQUETES DESP.', weight: 0.26, align: 'right', render: (r) => fmtNumero(r.paquetesDespachados, 0) },
    { key: 'reg', label: 'REGISTRADOS', weight: 0.24, align: 'right', render: (r) => fmtNumero(r.registrados, 0) },
    { key: 'peso', label: 'PESO DESP. (LBS)', weight: 0.22, align: 'right', render: (r) => fmtNumero(r.pesoLbs, 1) },
  ];
  drawTable<FilaPunto>(ctx, {
    columns: puntoCols,
    rows: puntos,
    empty: 'No hubo paquetes registrados ni despachados en este periodo.',
  });

  // ── Estado operativo actual ──
  drawSectionTitle(ctx, `Estado operativo actual (al ${fmtFechaHora(data.generadoEn)})`);
  drawInlineMetrics(ctx, 'Fotografía operativa', [
    { label: 'Pendientes', value: fmtNumero(estadoActual.pendientesDespacho, 0) },
    { label: 'Demorados', value: fmtNumero(estadoActual.demoradosSinDespachar, 0) },
    { label: 'Entregados sin despacho', value: fmtNumero(estadoActual.entregadosSinDespacho, 0) },
    { label: 'Excepciones', value: fmtNumero(estadoActual.excepcionesOperativas, 0) },
  ]);

  drawSectionTitle(ctx, 'Inventario por estado (actual)');
  const estadoCols: ColumnDef<EstadisticasDashboard['estadoActual']['distribucion'][number]>[] = [
    { key: 'estado', label: 'ESTADO', weight: 0.55, align: 'left', render: (r) => safeStr(r.nombre) },
    { key: 'codigo', label: 'CÓDIGO', weight: 0.25, align: 'left', render: (r) => safeStr(r.codigo), mono: true },
    { key: 'total', label: 'PAQUETES', weight: 0.2, align: 'right', render: (r) => fmtNumero(r.total, 0) },
  ];
  drawTable(ctx, {
    columns: estadoCols,
    rows: estadoActual.distribucion,
    empty: 'Sin paquetes registrados.',
  });

  drawSectionTitle(
    ctx,
    `Paquetes demorados sin despacho (> ${data.diasMaxSinDespachar} días laborables)`,
  );
  const demoradoCols: ColumnDef<PaqueteDemorado>[] = [
    { key: 'idx', label: '#', weight: 0.04, align: 'center', render: (_, i) => String(i + 1) },
    { key: 'guia', label: 'GUÍA', weight: 0.16, align: 'left', render: (r) => safeStr(r.numeroGuia), mono: true },
    { key: 'ref', label: 'REFERENCIA', weight: 0.12, align: 'left', render: (r) => safeStr(r.referencia), mono: true },
    { key: 'master', label: 'GUÍA MASTER', weight: 0.14, align: 'left', render: (r) => safeStr(r.guiaMaster), mono: true },
    { key: 'cons', label: 'CONSIGNATARIO', weight: 0.18, align: 'left', render: (r) => safeStr(r.consignatario) },
    { key: 'estado', label: 'ESTADO', weight: 0.12, align: 'left', render: (r) => safeStr(r.estado) },
    { key: 'reg', label: 'REGISTRADO', weight: 0.1, align: 'left', render: (r) => fmtFechaCorta(r.registradoEn) },
    { key: 'dias', label: 'DÍAS', weight: 0.07, align: 'right', render: (r) => String(r.diasSinDespachar) },
    { key: 'atraso', label: 'ATRASO', weight: 0.07, align: 'right', render: (r) => `+${r.diasAtraso}` },
  ];
  drawTable<PaqueteDemorado>(ctx, {
    columns: demoradoCols,
    rows: estadoActual.paquetesDemorados,
    empty: 'No hay paquetes que superen el tiempo estimado sin despacho.',
  });

  if (estadoActual.demoradosSinDespachar > estadoActual.paquetesDemorados.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...ECUBOX_PDF_COLORS.muted);
    doc.text(
      `Se muestran los ${estadoActual.paquetesDemorados.length} casos más antiguos de ${estadoActual.demoradosSinDespachar}.`,
      ctx.margin,
      ctx.y + 4,
    );
    ctx.y += 8;
  }

  if (estadoActual.entregadosSinDespacho > 0) {
    drawSectionTitle(ctx, 'Entregados sin despacho registrado (actual)');
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
      rows: estadoActual.paquetesEntregadosSinDespacho,
      empty: 'No hay inconsistencias de entrega sin despacho.',
    });
  }

  if (estadoActual.excepcionesOperativas > 0) {
    drawSectionTitle(ctx, 'Excepciones operativas y de integridad (actual)');
    const excepcionCols: ColumnDef<ExcepcionOperativa>[] = [
      { key: 'sev', label: 'SEV.', weight: 0.07, align: 'center', render: (r) => r.severidad },
      { key: 'mod', label: 'MÓDULO', weight: 0.14, align: 'left', render: (r) => safeStr(r.modulo) },
      { key: 'ref', label: 'REFERENCIA', weight: 0.15, align: 'left', render: (r) => safeStr(r.referencia), mono: true },
      { key: 'exc', label: 'EXCEPCIÓN', weight: 0.24, align: 'left', render: (r) => safeStr(r.titulo) },
      { key: 'det', label: 'DETALLE', weight: 0.4, align: 'left', render: (r) => safeStr(r.detalle) },
    ];
    drawTable<ExcepcionOperativa>(ctx, {
      columns: excepcionCols,
      rows: estadoActual.excepciones,
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
