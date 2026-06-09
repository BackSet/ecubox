import ExcelJS from 'exceljs';
import { downloadWorkbook } from '@/lib/xlsx/builders';
import type { MiDespachoDetalle } from '@/types/mis-despacho';

/** Exporta a Excel el despacho desde la vista de cliente (solo sus piezas). */
export async function downloadMiDespachoXlsx(d: MiDespachoDetalle): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Mis entregas');
  ws.columns = [
    { header: '#', key: 'n', width: 6 },
    { header: 'Guía', key: 'guia', width: 24 },
    { header: 'Ref', key: 'ref', width: 16 },
    { header: 'Contenido', key: 'cont', width: 32 },
    { header: 'Estado', key: 'estado', width: 24 },
    { header: 'Lbs', key: 'lbs', width: 10 },
    { header: 'Kg', key: 'kg', width: 10 },
  ];
  ws.getRow(1).font = { bold: true };

  d.piezas.forEach((p, i) => {
    ws.addRow({
      n: i + 1,
      guia: p.numeroGuia,
      ref: p.ref ?? '',
      cont: p.contenido ?? '',
      estado: p.estadoNombre ?? p.estadoCodigo ?? '',
      lbs: p.pesoLbs ?? 0,
      kg: p.pesoKg ?? 0,
    });
  });

  ws.addRow({});
  const total = ws.addRow({
    cont: 'Total',
    estado: `${d.totalPiezas} pieza(s)`,
    lbs: d.pesoLbsTotal ?? 0,
    kg: d.pesoKgTotal ?? 0,
  });
  total.font = { bold: true };

  await downloadWorkbook(wb, `mis-entregas-despacho-${d.despachoId}.xlsx`);
}
