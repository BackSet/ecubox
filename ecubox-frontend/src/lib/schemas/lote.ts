import { z } from 'zod';
import { fechaNoFuturaSchema, optionalTrimmedString } from './primitives';
import { guiaListSchema } from './bulk-guias';

export const loteRecepcionCreateSchema = z.object({
  fechaRecepcion: fechaNoFuturaSchema('La fecha de recepción'),
  observaciones: optionalTrimmedString(2000),
  numeroGuiasEnvio: guiaListSchema.min(1, 'Debe indicar al menos una guía de envío'),
});

export const agregarEnviosLoteSchema = z.object({
  numeroGuiasEnvio: guiaListSchema.min(1, 'Debe indicar al menos una guía de envío'),
});
