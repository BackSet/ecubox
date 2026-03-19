import { z } from 'zod';

/** Teléfono: solo dígitos, entre 7 y 15 caracteres (Ecuador/internacional). */
export const telefonoSchema = z
  .string()
  .min(1, 'El teléfono es obligatorio')
  .regex(/^\d+$/, 'Solo se permiten números')
  .min(7, 'Mínimo 7 dígitos')
  .max(15, 'Máximo 15 dígitos');

/** Cédula Ecuador: exactamente 10 dígitos. */
export const cedulaSchema = z
  .string()
  .min(1, 'La cédula es requerida')
  .regex(/^\d{10}$/, 'La cédula debe tener exactamente 10 dígitos numéricos');

/** Email opcional: si se escribe algo, debe ser un email válido. */
export const emailOpcionalSchema = z
  .string()
  .optional()
  .refine(
    (v) => !v || v.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    { message: 'Correo electrónico no válido' }
  );
