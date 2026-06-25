import { z } from 'zod';
import { optionalNumber, pesoPositivoSchema } from './primitives';

export const MAX_PAQUETES_BULK = 50;
export const MAX_CONTENIDO = 500;
export const MAX_REF = 120;

export const guiaMasterIdSchema = z
  .union([z.number(), z.nan()])
  .optional()
  .transform((v) => (typeof v === 'number' && Number.isNaN(v) ? undefined : v))
  .refine((n): n is number => n != null && n > 0, { message: 'Selecciona una guía' });

export const paqueteItemSchema = z.object({
  id: z.number().optional(),
  contenido: z
    .string()
    .min(1, 'El contenido es obligatorio')
    .max(MAX_CONTENIDO, `Máximo ${MAX_CONTENIDO} caracteres`),
  // El peso es opcional (vacío = peso pendiente). Si se ingresa, debe ser
  // mayor que 0: un 0 representa un peso escrito inválido, no "sin peso".
  pesoLbs: pesoPositivoSchema,
  pesoKg: pesoPositivoSchema,
  piezaNumero: optionalNumber,
});

export const paqueteFormSchema = z.object({
  guiaMasterId: guiaMasterIdSchema,
  contenido: z
    .string()
    .min(1, 'El contenido es obligatorio')
    .max(MAX_CONTENIDO, `Máximo ${MAX_CONTENIDO} caracteres`),
  pesoLbs: optionalNumber,
  pesoKg: optionalNumber,
  ref: z.string().max(MAX_REF, `Máximo ${MAX_REF} caracteres`).optional(),
});

export const paqueteBulkSchema = z
  .object({
    guiaMasterId: guiaMasterIdSchema,
    cantidad: z
      .number({ error: 'Ingresa la cantidad' })
      .int('Debe ser un número entero')
      .min(1, 'Mínimo 1 paquete')
      .max(MAX_PAQUETES_BULK, `Máximo ${MAX_PAQUETES_BULK} paquetes a la vez`),
    paquetes: z.array(paqueteItemSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const piezas = data.paquetes
      .map((p) => p.piezaNumero)
      .filter((n): n is number => n != null && !Number.isNaN(n));
    const unique = new Set(piezas);
    if (unique.size !== piezas.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Los números de pieza deben ser únicos',
        path: ['paquetes'],
      });
    }
  });

export function validatePaqueteBulkAgainstTotal(
  piezas: number[],
  totalPiezasEsperadas: number | undefined
): string | null {
  if (totalPiezasEsperadas == null || totalPiezasEsperadas <= 0) return null;
  const maxPieza = Math.max(...piezas, 0);
  if (maxPieza > totalPiezasEsperadas) {
    return `El número de pieza no puede superar ${totalPiezasEsperadas}`;
  }
  if (piezas.length > totalPiezasEsperadas) {
    return `No puedes crear más de ${totalPiezasEsperadas} piezas para esta guía`;
  }
  return null;
}
