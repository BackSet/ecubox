import { z } from 'zod';
import { hasPositivePeso, MAX_BULK_PESO_ITEMS, optionalNumber } from './primitives';

export const bulkPesoItemSchema = z
  .object({
    id: z.number(),
    pesoLbs: optionalNumber,
    pesoKg: optionalNumber,
  })
  .refine(hasPositivePeso, { message: 'El peso debe ser mayor a 0' });

export const bulkPesoRequestSchema = z
  .array(bulkPesoItemSchema)
  .min(1, 'No hay paquetes para guardar')
  .max(MAX_BULK_PESO_ITEMS, `Máximo ${MAX_BULK_PESO_ITEMS} paquetes por lote`);

export const distribuirTotalSchema = z.object({
  envioCodigo: z.string().optional(),
  guiaMasterTracking: z.string().optional(),
  totalLbs: optionalNumber,
  totalKg: optionalNumber,
  sobrescribir: z.boolean().optional(),
}).superRefine((data, ctx) => {
  const hasEnvio = (data.envioCodigo?.trim() ?? '') !== '';
  const hasGuia = (data.guiaMasterTracking?.trim() ?? '') !== '';
  if (!hasEnvio && !hasGuia) {
    ctx.addIssue({
      code: 'custom',
      message: 'Indica un envío o una guía master',
      path: ['envioCodigo'],
    });
  }
  const hasPeso =
    (data.totalLbs != null && !Number.isNaN(data.totalLbs) && data.totalLbs > 0) ||
    (data.totalKg != null && !Number.isNaN(data.totalKg) && data.totalKg > 0);
  if (!hasPeso) {
    ctx.addIssue({
      code: 'custom',
      message: 'Ingresa un peso total mayor a 0',
      path: ['totalLbs'],
    });
  }
});

export function validateBulkPeso(
  items: Array<{ id: number; pesoLbs?: number | null; pesoKg?: number | null }>
): { ok: true } | { ok: false; message: string; invalidIds?: number[] } {
  const result = bulkPesoRequestSchema.safeParse(items);
  if (result.success) return { ok: true };
  const msg = result.error.issues[0]?.message ?? 'Datos de pesaje inválidos';
  const invalidIds = items.filter((i) => !hasPositivePeso(i)).map((i) => i.id);
  return { ok: false, message: msg, invalidIds };
}
