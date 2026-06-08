import { z } from 'zod';
import { motivoRequiredSchema, motivoSchema, positiveId, trackingBaseSchema } from './primitives';

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
