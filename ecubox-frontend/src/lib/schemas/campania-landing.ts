import { z } from 'zod';

const TIPOS = ['OFERTA', 'INFORMACION', 'NOVEDAD', 'AVISO'] as const;
const DESTINOS = ['INTERNO', 'EXTERNO'] as const;

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .or(z.literal(''));

function esquemaPeligroso(url: string): boolean {
  const low = url.trim().toLowerCase();
  return low.startsWith('javascript:') || low.startsWith('data:') || low.startsWith('vbscript:');
}

/**
 * Validación del editor de campañas. Sin HTML libre (texto plano). Las reglas
 * cruzadas (CTA todo-o-nada, HTTPS, alt con imagen, fechas) se reflejan también
 * en el backend (defensa en profundidad). El título es opcional aquí (obligatorio
 * solo al publicar, validado en backend y en la acción de publicar).
 */
export const campaniaLandingSchema = z
  .object({
    nombreInterno: z
      .string()
      .trim()
      .min(1, 'El nombre interno es obligatorio')
      .max(120, 'Máximo 120 caracteres'),
    tipo: z.enum(TIPOS, { message: 'Selecciona un tipo' }),
    etiqueta: opcional(40),
    titulo: opcional(160),
    descripcion: opcional(500),
    textoCta: opcional(60),
    urlCta: opcional(500),
    tipoDestinoCta: z.enum(DESTINOS).optional(),
    imagenUrl: opcional(500),
    textoAlternativoImagen: opcional(200),
    fechaInicio: z.string().optional().or(z.literal('')),
    fechaFin: z.string().optional().or(z.literal('')),
  })
  .superRefine((v, ctx) => {
    const has = (s?: string) => !!s && s.trim().length > 0;

    // CTA todo-o-nada.
    const algunCta = has(v.textoCta) || has(v.urlCta) || !!v.tipoDestinoCta;
    if (algunCta) {
      if (!has(v.textoCta)) {
        ctx.addIssue({ code: 'custom', path: ['textoCta'], message: 'Requerido si configuras un CTA' });
      }
      if (!has(v.urlCta)) {
        ctx.addIssue({ code: 'custom', path: ['urlCta'], message: 'Requerido si configuras un CTA' });
      }
      if (!v.tipoDestinoCta) {
        ctx.addIssue({ code: 'custom', path: ['tipoDestinoCta'], message: 'Requerido si configuras un CTA' });
      }
      if (has(v.urlCta)) {
        const url = v.urlCta!.trim();
        if (esquemaPeligroso(url)) {
          ctx.addIssue({ code: 'custom', path: ['urlCta'], message: 'Tipo de URL no permitido' });
        } else if (v.tipoDestinoCta === 'INTERNO' && !url.startsWith('/')) {
          ctx.addIssue({ code: 'custom', path: ['urlCta'], message: 'Una URL interna debe empezar con «/»' });
        } else if (v.tipoDestinoCta === 'EXTERNO' && !url.toLowerCase().startsWith('https://')) {
          ctx.addIssue({ code: 'custom', path: ['urlCta'], message: 'Una URL externa debe usar HTTPS' });
        }
      }
    }

    // Imagen: HTTPS + alt obligatorio.
    if (has(v.imagenUrl)) {
      const img = v.imagenUrl!.trim();
      if (esquemaPeligroso(img) || !img.toLowerCase().startsWith('https://')) {
        ctx.addIssue({ code: 'custom', path: ['imagenUrl'], message: 'La imagen debe servirse por HTTPS' });
      }
      if (!has(v.textoAlternativoImagen)) {
        ctx.addIssue({
          code: 'custom',
          path: ['textoAlternativoImagen'],
          message: 'El texto alternativo es obligatorio cuando hay imagen',
        });
      }
    }

    // Fechas coherentes.
    if (has(v.fechaInicio) && has(v.fechaFin)) {
      const inicio = new Date(v.fechaInicio!);
      const fin = new Date(v.fechaFin!);
      if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fin.getTime()) && fin <= inicio) {
        ctx.addIssue({ code: 'custom', path: ['fechaFin'], message: 'La fecha de fin debe ser posterior a la de inicio' });
      }
    }
  });

export type CampaniaLandingFormValues = z.infer<typeof campaniaLandingSchema>;
