import { z } from 'zod';
import { codigoEnvioSchema } from './primitives';
import { guiaListSchema } from './bulk-guias';

export const envioConsolidadoCreateSchema = z.object({
  codigo: codigoEnvioSchema,
  numerosGuia: guiaListSchema.optional(),
});

export const envioConsolidadoPaquetesSchema = z.object({
  numerosGuia: guiaListSchema.min(1, 'Ingresa al menos una guía'),
});

export const asignarEnvioSchema = z
  .object({
    modo: z.enum(['existente', 'nuevo']),
    envioConsolidadoId: z.number().optional(),
    nuevoCodigo: z.string().optional(),
    numerosGuia: guiaListSchema.min(1, 'Ingresa al menos una guía'),
  })
  .superRefine((data, ctx) => {
    if (data.modo === 'existente') {
      if (data.envioConsolidadoId == null || data.envioConsolidadoId <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Selecciona un envío consolidado',
          path: ['envioConsolidadoId'],
        });
      }
    } else {
      const r = codigoEnvioSchema.safeParse(data.nuevoCodigo ?? '');
      if (!r.success) {
        ctx.addIssue({
          code: 'custom',
          message: r.error.issues[0]?.message ?? 'Código inválido',
          path: ['nuevoCodigo'],
        });
      }
    }
  });
