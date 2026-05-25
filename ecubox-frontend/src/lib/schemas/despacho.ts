import { z } from 'zod';
import { kgToLbs } from '@/lib/utils/weight';
import {
  fechaNoFuturaSchema,
  numeroGuiaSchema,
  optionalTrimmedString,
  refineTipoEntrega,
  tipoEntregaEnum,
} from './primitives';

export const INDIVIDUAL_KG_MAX = 8;

export const TAMANIO_LIMITS = {
  individualKgMin: 0.1,
  individualKgMax: INDIVIDUAL_KG_MAX,
  pequenoKg: 30,
  medianoKg: 40,
  grandeKg: 50,
} as const;

export const TAMANIO_LIMITS_LBS = {
  individualLbsMin: 0.1,
  individualLbsMax: kgToLbs(INDIVIDUAL_KG_MAX),
  pequenoLbs: kgToLbs(30),
  medianoLbs: kgToLbs(40),
  grandeLbs: kgToLbs(50),
};

export const UX_MESSAGES = {
  refineDestino: 'Completa el destino según el tipo de entrega: consignatario (domicilio) o agencia.',
  domicilioRegla: 'En despachos a domicilio, todos los paquetes deben ser del mismo consignatario.',
  agenciaRegla: 'En despachos a agencia, todos los paquetes deben coincidir en provincia y cantón.',
  agenciaCourierEntregaRegla:
    'En despachos a punto de entrega, todos los paquetes deben tener el mismo consignatario.',
  seleccionarConsignatario: 'Selecciona un consignatario para continuar.',
  seleccionarAgencia: 'Selecciona una agencia para continuar.',
  seleccionarAgenciaCourierEntrega: 'Selecciona un punto de entrega para continuar.',
  validarPaquetes: 'No pudimos validar algunos paquetes seleccionados. Revisa la lista e inténtalo de nuevo.',
  detectarConsignatario: 'No se pudo identificar el consignatario desde los paquetes agregados.',
  minSacas: 'Debes tener al menos una saca para continuar.',
} as const;

export const sacaTamanioEnum = z.enum(['INDIVIDUAL', 'PEQUENO', 'MEDIANO', 'GRANDE']);

export const sacaNuevaSchema = z.object({
  numeroOrden: z.string().optional(),
  pesoLbs: z.union([z.number(), z.nan()]).optional(),
  pesoKg: z.union([z.number(), z.nan()]).optional(),
  tamanio: sacaTamanioEnum.optional(),
  paqueteIds: z.array(z.number()).optional(),
});

export const despachoBaseFields = {
  numeroGuia: numeroGuiaSchema,
  courierEntregaId: z.number().refine((n) => n > 0, 'Selecciona un courier de entrega'),
  tipoEntrega: tipoEntregaEnum,
  consignatarioId: z.number().optional(),
  agenciaId: z.number().optional(),
  agenciaCourierEntregaId: z.number().optional(),
  observaciones: optionalTrimmedString(2000),
  codigoPrecinto: optionalTrimmedString(120),
  sacaIds: z.array(z.number()).optional(),
};

export const despachoCreateSchema = z
  .object(despachoBaseFields)
  .superRefine((data, ctx) => refineTipoEntrega(data, ctx));

export const despachoStepperSchema = z
  .object({
    ...despachoBaseFields,
    fechaHora: fechaNoFuturaSchema('Fecha y hora'),
    sacasNuevas: z.array(sacaNuevaSchema),
  })
  .superRefine((data, ctx) => refineTipoEntrega(data, ctx));

export const puntoEntregaOperarioSchema = z.object({
  provincia: z.string().min(1, 'Selecciona una provincia'),
  canton: z.string().min(1, 'Selecciona un cantón'),
  direccion: z.string().min(1, 'La dirección es obligatoria').max(255, 'Máximo 255 caracteres'),
  horarioAtencion: z.string().max(255, 'Máximo 255 caracteres').optional(),
  diasMaxRetiro: z
    .string()
    .optional()
    .refine(
      (v) => v == null || v.trim() === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 365),
      { message: 'Debe ser un número entre 0 y 365' }
    ),
});

export function sacaPesoExcedeLimite(
  tamanio: z.infer<typeof sacaTamanioEnum> | undefined,
  kg: number,
  lbs: number
): string | null {
  if (!tamanio) return null;
  const hasKg = kg > 0;
  const hasLbs = lbs > 0;
  if (!hasKg && !hasLbs) return null;

  const limits: Record<z.infer<typeof sacaTamanioEnum>, { kg: number; lbs: number }> = {
    INDIVIDUAL: { kg: TAMANIO_LIMITS.individualKgMax, lbs: TAMANIO_LIMITS_LBS.individualLbsMax },
    PEQUENO: { kg: TAMANIO_LIMITS.pequenoKg, lbs: TAMANIO_LIMITS_LBS.pequenoLbs },
    MEDIANO: { kg: TAMANIO_LIMITS.medianoKg, lbs: TAMANIO_LIMITS_LBS.medianoLbs },
    GRANDE: { kg: TAMANIO_LIMITS.grandeKg, lbs: TAMANIO_LIMITS_LBS.grandeLbs },
  };
  const lim = limits[tamanio];
  if ((hasKg && kg > lim.kg) || (hasLbs && lbs > lim.lbs)) {
    return `El peso excede el máximo para saca ${tamanio.toLowerCase()}`;
  }
  return null;
}
