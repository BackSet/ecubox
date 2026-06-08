import { z } from 'zod';

export const MAX_NOTAS = 4000;
export const MAX_MOTIVO = 500;
export const MAX_CODIGO_ENVIO = 100;
export const MAX_NUMERO_GUIA = 120;
export const MAX_GUIAS_BULK = 500;
export const MAX_BULK_PESO_ITEMS = 100;

export const requiredString = (label: string, max = 255) =>
  z
    .string()
    .min(1, `${label} es obligatorio`)
    .max(max, `Máximo ${max} caracteres`)
    .transform((s) => s.trim());

export const optionalTrimmedString = (max = 255) =>
  z
    .string()
    .optional()
    .transform((s) => (s == null ? undefined : s.trim() === '' ? undefined : s.trim()))
    .refine((s) => s == null || s.length <= max, { message: `Máximo ${max} caracteres` });

export const positiveId = (label: string) =>
  z.number({ error: `Selecciona ${label}` }).refine((n) => n > 0, { message: `Selecciona ${label}` });

export const optionalId = z.number().optional();

export const optionalNumber = z
  .union([z.number(), z.nan()])
  .optional()
  .transform((v) => (typeof v === 'number' && Number.isNaN(v) ? undefined : v));

export const motivoSchema = (required = false) => {
  const base = z.string().max(MAX_MOTIVO, `Máximo ${MAX_MOTIVO} caracteres`);
  return required
    ? base.min(1, 'El motivo es obligatorio').transform((s) => s.trim())
    : base.optional().transform((s) => (s?.trim() === '' ? undefined : s?.trim()));
};

export const motivoRequiredSchema = z
  .string()
  .min(1, 'El motivo es obligatorio')
  .max(MAX_MOTIVO, `Máximo ${MAX_MOTIVO} caracteres`)
  .transform((s) => s.trim());

export const notasSchema = z
  .string()
  .max(MAX_NOTAS, `Máximo ${MAX_NOTAS} caracteres`)
  .optional()
  .or(z.literal(''));

export const codigoEnvioSchema = z
  .string()
  .min(1, 'El código del envío es obligatorio')
  .max(MAX_CODIGO_ENVIO, `Máximo ${MAX_CODIGO_ENVIO} caracteres`)
  .transform((s) => s.trim());

export const numeroGuiaSchema = z
  .string()
  .min(1, 'El número de guía es obligatorio')
  .max(MAX_NUMERO_GUIA, `Máximo ${MAX_NUMERO_GUIA} caracteres`)
  .transform((s) => s.trim());

export const trackingBaseSchema = z
  .string()
  .min(1, 'El número de guía es obligatorio')
  .max(MAX_NUMERO_GUIA, `Máximo ${MAX_NUMERO_GUIA} caracteres`)
  .transform((s) => s.trim());

export const diasMaxRetiroSchema = z
  .union([
    z.number().int('Debe ser un número entero').min(0, 'Debe ser mayor o igual a 0').max(365, 'Máximo 365 días'),
    z.nan(),
  ])
  .transform((n) => (Number.isNaN(n) ? undefined : n))
  .optional();

export const diasMaxRetiroRequiredSchema = z
  .string()
  .optional()
  .refine(
    (v) => v == null || v.trim() === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 365),
    { message: 'Debe ser un número entre 0 y 365' }
  );

export function isFechaNoFutura(value: string): boolean {
  if (!value.trim()) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= Date.now();
}

export const fechaNoFuturaSchema = (label = 'La fecha') =>
  z
    .string()
    .min(1, `${label} es obligatoria`)
    .refine(isFechaNoFutura, { message: `${label} no puede ser futura` });

export const fechaDocumentoSchema = z.string().min(1, 'Selecciona la fecha del documento');

export const periodoSchema = z
  .object({
    periodoDesde: z.string().optional().or(z.literal('')),
    periodoHasta: z.string().optional().or(z.literal('')),
  })
  .refine(
    (v) => {
      if (!v.periodoDesde || !v.periodoHasta) return true;
      return v.periodoDesde <= v.periodoHasta;
    },
    {
      message: 'El período "desde" no puede ser posterior a "hasta"',
      path: ['periodoHasta'],
    }
  );

export const manifiestoPeriodoSchema = z
  .object({
    fechaInicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
    fechaFin: z.string().min(1, 'La fecha de fin es obligatoria'),
  })
  .refine((v) => v.fechaInicio <= v.fechaFin, {
    message: 'La fecha de fin no puede ser anterior a la de inicio',
    path: ['fechaFin'],
  });

export function hasPositivePeso(p: { pesoKg?: number | null; pesoLbs?: number | null }): boolean {
  return (
    (p.pesoKg != null && !Number.isNaN(p.pesoKg) && p.pesoKg > 0) ||
    (p.pesoLbs != null && !Number.isNaN(p.pesoLbs) && p.pesoLbs > 0)
  );
}

export const pesoPositivoSchema = optionalNumber.refine(
  (v) => v == null || v > 0,
  { message: 'El peso debe ser mayor a 0' }
);

export const montoNoNegativoSchema = z
  .number({ error: 'El valor es obligatorio' })
  .min(0, 'Debe ser mayor o igual a 0');

export const tipoEntregaEnum = z.enum(['DOMICILIO', 'AGENCIA', 'AGENCIA_COURIER_ENTREGA']);

export const UX_DESTINO_MESSAGE =
  'Completa el destino según el tipo de entrega: consignatario (domicilio) o agencia.';

export function refineTipoEntrega(
  data: {
    tipoEntrega: z.infer<typeof tipoEntregaEnum>;
    consignatarioId?: number;
    agenciaId?: number;
    agenciaCourierEntregaId?: number;
    courierEntregaId?: number;
    numeroGuia?: string;
    /** Solo para AGENCIA: true = se envía por courier; false = retiro en oficina. */
    agenciaEnvioPorCourier?: boolean;
  },
  ctx: z.RefinementCtx,
  path: (string | number)[] = ['consignatarioId']
) {
  if (data.tipoEntrega === 'DOMICILIO') {
    if (data.consignatarioId == null || data.consignatarioId <= 0) {
      ctx.addIssue({ code: 'custom', message: UX_DESTINO_MESSAGE, path });
    }
  } else if (data.tipoEntrega === 'AGENCIA') {
    if (data.agenciaId == null || data.agenciaId <= 0) {
      ctx.addIssue({ code: 'custom', message: UX_DESTINO_MESSAGE, path: ['agenciaId'] });
    }
  } else if (data.tipoEntrega === 'AGENCIA_COURIER_ENTREGA') {
    if (data.agenciaCourierEntregaId == null || data.agenciaCourierEntregaId <= 0) {
      ctx.addIssue({ code: 'custom', message: UX_DESTINO_MESSAGE, path: ['agenciaCourierEntregaId'] });
    }
  }

  // Courier + número de guía: obligatorios cuando la entrega viaja por courier.
  // Domicilio y punto de entrega siempre viajan. La entrega en agencia viaja
  // solo si se eligió "envío por courier" (retiro en oficina no lleva courier;
  // la guía se autogenera en el backend). Si no se indicó la modalidad, se
  // deriva de si hay courier seleccionado.
  const viajaPorCourier =
    data.tipoEntrega === 'AGENCIA'
      ? (data.agenciaEnvioPorCourier ?? (data.courierEntregaId != null && data.courierEntregaId > 0))
      : true;
  if (viajaPorCourier) {
    if (data.courierEntregaId == null || data.courierEntregaId <= 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecciona un courier de entrega',
        path: ['courierEntregaId'],
      });
    }
    if (!data.numeroGuia || data.numeroGuia.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'El número de guía es obligatorio',
        path: ['numeroGuia'],
      });
    }
  }
}

export const trackingSearchSchema = z
  .string()
  .min(1, 'Ingresa un código de guía')
  .transform((s) => s.trim())
  .refine((s) => s.length >= 4, { message: 'Mínimo 4 caracteres' });
