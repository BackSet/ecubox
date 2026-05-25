export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface ManifiestoPeriodoPreset {
  id: string;
  label: string;
  range: () => { fechaInicio: string; fechaFin: string };
}

export const MANIFIESTO_PERIOD_PRESETS: ManifiestoPeriodoPreset[] = [
  {
    id: 'hoy',
    label: 'Hoy',
    range: () => {
      const t = new Date();
      return { fechaInicio: isoDate(t), fechaFin: isoDate(t) };
    },
  },
  {
    id: 'ayer',
    label: 'Ayer',
    range: () => {
      const t = new Date();
      t.setDate(t.getDate() - 1);
      return { fechaInicio: isoDate(t), fechaFin: isoDate(t) };
    },
  },
  {
    id: '7d',
    label: 'Últimos 7 días',
    range: () => {
      const fin = new Date();
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 6);
      return { fechaInicio: isoDate(inicio), fechaFin: isoDate(fin) };
    },
  },
  {
    id: '15d',
    label: 'Últimos 15 días',
    range: () => {
      const fin = new Date();
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 14);
      return { fechaInicio: isoDate(inicio), fechaFin: isoDate(fin) };
    },
  },
  {
    id: 'mesActual',
    label: 'Mes actual',
    range: () => {
      const ahora = new Date();
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
      return { fechaInicio: isoDate(inicio), fechaFin: isoDate(fin) };
    },
  },
  {
    id: 'mesPasado',
    label: 'Mes pasado',
    range: () => {
      const ahora = new Date();
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
      return { fechaInicio: isoDate(inicio), fechaFin: isoDate(fin) };
    },
  },
];

export const DESPACHO_ESTADO_PERIOD_PRESETS = [
  { id: 'hoy' as const, label: 'Hoy' },
  { id: '7d' as const, label: '7 días' },
  { id: 'mes' as const, label: 'Este mes' },
];
