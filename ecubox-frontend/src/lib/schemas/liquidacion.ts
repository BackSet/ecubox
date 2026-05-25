import { z } from 'zod';
import { fechaDocumentoSchema, montoNoNegativoSchema, notasSchema, periodoSchema } from './primitives';

export const liquidacionCrearSchema = z
  .object({
    fechaDocumento: fechaDocumentoSchema,
    periodoDesde: z.string().optional().or(z.literal('')),
    periodoHasta: z.string().optional().or(z.literal('')),
    notas: notasSchema,
  })
  .and(periodoSchema);

export const liquidacionHeaderSchema = z
  .object({
    fechaDocumento: fechaDocumentoSchema,
    periodoDesde: z.string().optional().or(z.literal('')),
    periodoHasta: z.string().optional().or(z.literal('')),
    notas: notasSchema,
  })
  .and(periodoSchema);

export const liquidacionConsolidadoLineaSchema = z
  .object({
    envioConsolidadoId: z.number().int().nonnegative().optional(),
    envioConsolidadoCodigo: z.string().max(100).optional().or(z.literal('')),
    costoProveedor: montoNoNegativoSchema,
    ingresoCliente: montoNoNegativoSchema,
    notas: notasSchema,
  })
  .refine(
    (v) =>
      (v.envioConsolidadoId != null && v.envioConsolidadoId > 0) ||
      (v.envioConsolidadoCodigo?.trim().length ?? 0) > 0,
    {
      message: 'Selecciona un consolidado o ingresa un código nuevo',
      path: ['envioConsolidadoId'],
    }
  );

export const liquidacionDespachoLineaSchema = z.object({
  despachoId: z.number().refine((n) => n > 0, 'Selecciona un despacho'),
  pesoKg: montoNoNegativoSchema,
  kgIncluidos: montoNoNegativoSchema,
  precioFijo: montoNoNegativoSchema,
  precioKgAdicional: montoNoNegativoSchema,
  notas: notasSchema,
});
