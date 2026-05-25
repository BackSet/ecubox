import { z } from 'zod';

const urlOptional = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/.+/i.test(v), 'Debe comenzar con http:// o https://');

function visibleRequiresValor(item: { valor: string; visible: boolean }, ctx: z.RefinementCtx) {
  if (!item.valor && item.visible) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'No se puede mostrar sin valor',
      path: ['visible'],
    });
  }
}

const emailCanalSchema = z
  .object({
    valor: z
      .string()
      .trim()
      .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Correo no válido'),
    visible: z.boolean(),
  })
  .superRefine(visibleRequiresValor);

const telefonoCanalSchema = z
  .object({
    valor: z.string().trim().max(30, 'Máximo 30 caracteres'),
    visible: z.boolean(),
  })
  .superRefine(visibleRequiresValor);

const whatsappCanalSchema = z
  .object({
    valor: z.string().trim().max(200, 'Máximo 200 caracteres'),
    visible: z.boolean(),
  })
  .superRefine(visibleRequiresValor);

const urlCanalSchema = z
  .object({
    valor: urlOptional,
    visible: z.boolean(),
  })
  .superRefine(visibleRequiresValor);

export const canalesComunicacionSchema = z.object({
  email: emailCanalSchema,
  telefono: telefonoCanalSchema,
  whatsapp: whatsappCanalSchema,
  facebook: urlCanalSchema,
  instagram: urlCanalSchema,
  tiktok: urlCanalSchema,
  youtube: urlCanalSchema,
  linkedin: urlCanalSchema,
  x: urlCanalSchema,
});

export type CanalesComunicacionForm = z.infer<typeof canalesComunicacionSchema>;
