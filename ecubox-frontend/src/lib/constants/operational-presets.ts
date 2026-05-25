export const HORARIOS_PRESET: Array<{ label: string; value: string }> = [
  { label: 'L-V 8:00–18:00', value: 'Lunes a Viernes 8:00 - 18:00' },
  { label: 'L-S 9:00–19:00', value: 'Lunes a Sábado 9:00 - 19:00' },
  {
    label: 'L-V 8:00–17:00, S 9:00–13:00',
    value: 'Lunes a Viernes 8:00 - 17:00, Sábado 9:00 - 13:00',
  },
  { label: '24/7', value: 'Atención 24 horas, todos los días' },
];

export const RETIRO_PRESETS = [3, 5, 7, 15, 30] as const;

export const RETIRO_PRESETS_COURIER = [1, 2, 3, 5, 7] as const;

export const CANTIDAD_PRESETS = [1, 2, 3, 5, 10] as const;

export const PRESETS_LBS: Array<{ label: string; valor: number }> = [
  { label: '1 lb', valor: 1 },
  { label: '2 lbs', valor: 2 },
  { label: '5 lbs', valor: 5 },
  { label: '10 lbs', valor: 10 },
  { label: '20 lbs', valor: 20 },
  { label: '50 lbs', valor: 50 },
];

export function formatDatetimeLocalNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
