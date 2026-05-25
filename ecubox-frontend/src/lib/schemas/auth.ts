import { z } from 'zod';
import { emailOpcionalSchema } from '@/lib/validation';

export const PASSWORD_MIN_LENGTH = 6;

const usernameRegex = /^[a-zA-Z0-9._-]+$/;

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'El usuario o correo es requerido')
    .transform((s) => s.trim()),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const registroSchema = z
  .object({
    email: z
      .string()
      .min(1, 'El correo es requerido')
      .email('Correo electrónico no válido')
      .max(255, 'Máximo 255 caracteres'),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`),
    passwordConfirm: z.string().min(1, 'Repite la contraseña'),
    acceptTerms: z.literal(true, {
      message: 'Debes aceptar los términos para continuar',
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirm'],
  });

export const accountUpdateSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Correo electrónico no válido'),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`),
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const usuarioBaseSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  email: emailOpcionalSchema,
  enabled: z.boolean(),
  roleIds: z.array(z.number()),
});

export const usuarioCreateSchema = usuarioBaseSchema.superRefine((data, ctx) => {
  const username = data.username?.trim() ?? '';
  if (username.length < 3) {
    ctx.addIssue({ code: 'custom', message: 'Mínimo 3 caracteres', path: ['username'] });
  } else if (username.length > 50) {
    ctx.addIssue({ code: 'custom', message: 'Máximo 50 caracteres', path: ['username'] });
  } else if (!usernameRegex.test(username)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Solo letras, números, punto, guion y guion bajo',
      path: ['username'],
    });
  }
  const password = data.password ?? '';
  if (password.length < PASSWORD_MIN_LENGTH) {
    ctx.addIssue({
      code: 'custom',
      message: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
      path: ['password'],
    });
  }
  if (data.roleIds.length === 0) {
    ctx.addIssue({ code: 'custom', message: 'Selecciona al menos un rol', path: ['roleIds'] });
  }
});

export const usuarioUpdateSchema = usuarioBaseSchema.superRefine((data, ctx) => {
  const username = data.username?.trim() ?? '';
  if (username.length > 0) {
    if (username.length < 3) {
      ctx.addIssue({ code: 'custom', message: 'Mínimo 3 caracteres', path: ['username'] });
    } else if (username.length > 50) {
      ctx.addIssue({ code: 'custom', message: 'Máximo 50 caracteres', path: ['username'] });
    } else if (!usernameRegex.test(username)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Solo letras, números, punto, guion y guion bajo',
        path: ['username'],
      });
    }
  }
  const password = data.password ?? '';
  if (password.length > 0 && password.length < PASSWORD_MIN_LENGTH) {
    ctx.addIssue({
      code: 'custom',
      message: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
      path: ['password'],
    });
  }
});

export const rolPermisosSchema = z.object({
  permisoIds: z.array(z.number()),
});

export const gestionarEstadosBulkSchema = z.object({
  estadoTargetId: z.number().refine((n) => n > 0, 'Selecciona un estado'),
  paqueteIds: z.array(z.number()).min(1, 'Selecciona al menos un paquete'),
});
