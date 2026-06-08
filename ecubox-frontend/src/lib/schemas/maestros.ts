import { z } from 'zod';
import { telefonoSchema, emailOpcionalSchema } from '@/lib/validation';
import { diasMaxRetiroSchema } from './primitives';

export const consignatarioFormSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'Mínimo 3 caracteres')
    .max(120, 'Máximo 120 caracteres'),
  telefono: telefonoSchema,
  direccion: z
    .string()
    .min(1, 'La dirección es obligatoria')
    .min(5, 'Mínimo 5 caracteres')
    .max(255, 'Máximo 255 caracteres'),
  provincia: z.string().min(1, 'La provincia es obligatoria'),
  canton: z.string().min(1, 'El cantón es obligatorio'),
  codigo: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim().length === 0 || v.trim().length >= 5,
      'El código debe tener al menos 5 caracteres'
    ),
  clienteUsuarioId: z.number().optional(),
});

export const agenciaFormSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'Mínimo 3 caracteres')
    .max(120, 'Máximo 120 caracteres'),
  codigo: z
    .string()
    .min(1, 'El código es obligatorio')
    .min(2, 'Mínimo 2 caracteres')
    .max(40, 'Máximo 40 caracteres')
    .regex(/^[A-Z0-9_-]+$/i, 'Solo letras, números, guion y guion bajo'),
  encargado: z.string().max(120, 'Máximo 120 caracteres').optional(),
  direccion: z.string().max(255, 'Máximo 255 caracteres').optional(),
  provincia: z.string().optional(),
  canton: z.string().optional(),
  horarioAtencion: z.string().max(255, 'Máximo 255 caracteres').optional(),
  diasMaxRetiro: diasMaxRetiroSchema,
});

export const courierEntregaFormSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'Mínimo 3 caracteres')
    .max(120, 'Máximo 120 caracteres'),
  codigo: z
    .string()
    .min(1, 'El código es obligatorio')
    .min(2, 'Mínimo 2 caracteres')
    .max(40, 'Máximo 40 caracteres')
    .regex(/^[A-Z0-9_-]+$/i, 'Solo letras, números, guion y guion bajo'),
  email: emailOpcionalSchema,
  horarioReparto: z.string().max(255, 'Máximo 255 caracteres').optional(),
  paginaTracking: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim() === '' || /^https?:\/\/.+/i.test(v.trim()),
      { message: 'La página de tracking debe iniciar con http:// o https://' }
    ),
  diasMaxRetiroDomicilio: diasMaxRetiroSchema,
});

export const puntoEntregaFormSchema = z.object({
  courierEntregaId: z.number().refine((n) => n > 0, 'Seleccione un courier de entrega'),
  direccion: z.string().max(255, 'Máximo 255 caracteres').optional(),
  provincia: z.string().optional(),
  canton: z.string().optional(),
  horarioAtencion: z.string().max(255, 'Máximo 255 caracteres').optional(),
  diasMaxRetiro: diasMaxRetiroSchema,
});

export const manifiestoFormSchema = z
  .object({
    fechaInicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
    fechaFin: z.string().min(1, 'La fecha de fin es obligatoria'),
  })
  .refine((v) => v.fechaInicio <= v.fechaFin, {
    message: 'La fecha de fin no puede ser anterior a la de inicio',
    path: ['fechaFin'],
  });

export const tarifaDistribucionFormSchema = z.object({
  kgIncluidos: z.number().min(0, 'Debe ser mayor o igual a 0'),
  precioFijo: z.number().min(0, 'Debe ser mayor o igual a 0'),
  precioKgAdicional: z.number().min(0, 'Debe ser mayor o igual a 0'),
});

export const tarifaCalculadoraFormSchema = z.object({
  tarifaPorLibra: z.number().min(0, 'Debe ser mayor o igual a 0'),
});

export const estadoRastreoFormSchema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio').max(50, 'Máximo 50 caracteres'),
  nombre: z.string().min(1, 'El nombre es obligatorio').max(120, 'Máximo 120 caracteres'),
  leyenda: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

export const mensajePlantillaSchema = z
  .string()
  .min(1, 'La plantilla no puede estar vacía')
  .max(4000, 'Máximo 4000 caracteres');

export const estadosPorPuntoSchema = z.object({
  estadoRegistrarPaqueteId: z.number().refine((n) => n > 0, 'Obligatorio'),
  estadoLoteRecepcionId: z.number().refine((n) => n > 0, 'Obligatorio'),
  estadoDespachoId: z.number().refine((n) => n > 0, 'Obligatorio'),
  estadoTransitoId: z.number().refine((n) => n > 0, 'Obligatorio'),
  estadoEntregaAgenciaId: z.number().refine((n) => n > 0, 'Obligatorio'),
  estadoEntregaDomicilioId: z.number().refine((n) => n > 0, 'Obligatorio'),
  estadoDevolucionId: z.number().refine((n) => n > 0, 'Obligatorio'),
  estadoCanceladoId: z.number().refine((n) => n > 0, 'Obligatorio'),
});
