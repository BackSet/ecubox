import { z } from 'zod';
import {
  MAX_NUMERO_GUIA,
  motivoRequiredSchema,
  motivoSchema,
  positiveId,
  trackingBaseSchema,
} from './primitives';

/** Máximo de guías que el cliente puede registrar de una vez (carga secuencial). */
export const MAX_MIS_GUIAS_BULK = 50;

/**
 * Registro de una o varias guías para un mismo consignatario (cliente).
 * Las filas vacías se permiten (se ignoran al guardar) para no estorbar la
 * captura rápida; basta con que haya al menos una con número.
 */
export const miGuiasBulkSchema = z
  .object({
    consignatarioId: positiveId('un consignatario'),
    guias: z
      .array(
        z.object({
          tracking: z.string().max(MAX_NUMERO_GUIA, `Máximo ${MAX_NUMERO_GUIA} caracteres`),
        }),
      )
      .min(1)
      .max(MAX_MIS_GUIAS_BULK, `Máximo ${MAX_MIS_GUIAS_BULK} guías a la vez`),
  })
  .superRefine((data, ctx) => {
    const conNumero = data.guias.filter((g) => g.tracking.trim().length > 0);
    if (conNumero.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Agrega al menos una guía con número', path: ['guias'] });
    }
  });

export const guiaMasterCreateSchema = z.object({
  trackingBase: trackingBaseSchema,
  consignatarioId: positiveId('un consignatario'),
});

export const guiaMasterUpdateConsignatarioSchema = z.object({
  clienteId: z.number().optional(),
  consignatarioId: positiveId('un destinatario'),
});

export const guiaMasterUpdateTotalSchema = z.object({
  totalPiezasEsperadas: z
    .number({ error: 'Ingresa el total de piezas' })
    .int('Debe ser un número entero')
    .min(1, 'Debe tener al menos una pieza'),
});

export const miGuiaSchema = z.object({
  trackingBase: trackingBaseSchema,
  consignatarioId: positiveId('un destinatario'),
});

export const miGuiaConsignatarioSchema = z.object({
  consignatarioId: positiveId('un destinatario'),
});

export const guiaMotivoRequiredSchema = motivoRequiredSchema;

export const guiaMotivoOptionalSchema = motivoSchema(false);

export const guiaCancelarSchema = z.object({
  motivo: motivoRequiredSchema,
});

export const guiaReabrirSchema = z.object({
  motivo: motivoRequiredSchema,
});
