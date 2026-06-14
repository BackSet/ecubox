import ExcelJS from 'exceljs';
import { downloadWorkbook } from '@/lib/xlsx/builders';
import { modalidadLabelDetalle } from '@/lib/entregas/modalidad';
import type { MiDespachoDetalle } from '@/types/mis-despacho';

/** Exporta a Excel la entrega desde la vista de cliente (solo sus paquetes). */
export async function downloadMiDespachoXlsx(d: MiDespachoDetalle): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Mis entregas');

  // Anchos por columna (posicional: 1..7).
  const widths = [6, 24, 16, 32, 24, 10, 10];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Encabezado de la entrega (datos seguros del cliente, sin totales globales).
  const meta: Array<[string, string]> = [
    ['Número de rastreo', d.numeroGuia ?? `Entrega #${d.despachoId}`],
    ['Entrega', `Entrega #${d.despachoId}`],
    ['Modalidad', modalidadLabelDetalle(d)],
    ['Destino', d.destinoNombre ?? '—'],
    ['Operador', d.operadorEntregaNombre ?? '—'],
    ['Confirmación', d.entregaConfirmada ? 'Recibida' : 'Pendiente'],
  ];
  meta.forEach(([label, value]) => {
    const row = ws.addRow([label, value]);
    row.getCell(1).font = { bold: true };
  });
  ws.addRow([]);

  const header = ws.addRow(['#', 'Guía', 'Ref', 'Contenido', 'Estado', 'Lbs', 'Kg']);
  header.font = { bold: true };

  d.piezas.forEach((p, i) => {
    ws.addRow([
      i + 1,
      p.numeroGuia,
      p.ref ?? '',
      p.contenido ?? '',
      p.estadoNombre ?? p.estadoCodigo ?? '',
      p.pesoLbs ?? 0,
      p.pesoKg ?? 0,
    ]);
  });

  ws.addRow([]);
  const total = ws.addRow(['', '', '', 'Total', `${d.totalPiezas} paquete(s)`, d.pesoLbsTotal ?? 0, d.pesoKgTotal ?? 0]);
  total.font = { bold: true };

  await downloadWorkbook(wb, `mis-entregas-${d.numeroGuia ?? d.despachoId}.xlsx`);
}
