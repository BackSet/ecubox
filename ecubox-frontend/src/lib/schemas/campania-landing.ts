import { z } from 'zod';

const TIPOS = ['OFERTA', 'INFORMACION', 'NOVEDAD', 'AVISO'] as const;
const DESTINOS = ['INTERNO', 'EXTERNO'] as const;

const opcional = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`).optional().or(z.literal(''));

function esquemaPeligroso(url: string): boolean {
  const low = url.trim().toLowerCase();
  return low.startsWith('javascript:') || low.startsWith('data:') || low.startsWith('vbscript:');
}
function esHttps(url: string): boolean {
  return url.trim().toLowerCase().startsWith('https://');
}
const has = (s?: string) => !!s && s.trim().length > 0;

/** Forma del editor (texto plano, sin HTML). Dos imágenes por tema, alt único. */
const baseShape = z.object({
  nombreInterno: z.string().trim().min(1, 'El nombre interno es obligatorio').max(120, 'Máximo 120 caracteres'),
  tipo: z.enum(TIPOS, { message: 'Selecciona un tipo' }),
  etiqueta: opcional(40),
  titulo: opcional(160),
  descripcion: opcional(500),
  textoCta: opcional(60),
  urlCta: opcional(500),
  tipoDestinoCta: z.enum(DESTINOS).optional(),
  imagenUrlClaro: opcional(500),
  imagenUrlOscuro: opcional(500),
  textoAlternativoImagen: opcional(200),
  fechaInicio: z.string().optional().or(z.literal('')),
  fechaFin: z.string().optional().or(z.literal('')),
});

export type CampaniaLandingFormValues = z.infer<typeof baseShape>;

/**
 * Reglas que aplican SIEMPRE (también al guardar borrador): nunca se almacena un
 * esquema peligroso y las fechas deben ser coherentes. Lo demás puede quedar
 * incompleto en un borrador.
 */
function refinarComun(v: CampaniaLandingFormValues, ctx: z.RefinementCtx) {
  for (const campo of ['urlCta', 'imagenUrlClaro', 'imagenUrlOscuro'] as const) {
    const val = v[campo];
    if (has(val) && esquemaPeligroso(val!)) {
      ctx.addIssue({ code: 'custom', path: [campo], message: 'Tipo de URL no permitido' });
    }
  }
  if (has(v.fechaInicio) && has(v.fechaFin)) {
    const inicio = new Date(v.fechaInicio!);
    const fin = new Date(v.fechaFin!);
    if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fin.getTime()) && fin <= inicio) {
      ctx.addIssue({ code: 'custom', path: ['fechaFin'], message: 'La fecha de fin debe ser posterior a la de inicio' });
    }
  }
}

/** Requisitos adicionales para publicar (sobre los comunes). */
function refinarPublicacion(v: CampaniaLandingFormValues, ctx: z.RefinementCtx) {
  if (!has(v.titulo)) {
    ctx.addIssue({ code: 'custom', path: ['titulo'], message: 'El título es obligatorio para publicar' });
  }
  // CTA: completo o vacío.
  const algunCta = has(v.textoCta) || has(v.urlCta) || !!v.tipoDestinoCta;
  if (algunCta) {
    if (!has(v.textoCta)) ctx.addIssue({ code: 'custom', path: ['textoCta'], message: 'Requerido si configuras un botón' });
    if (!has(v.urlCta)) ctx.addIssue({ code: 'custom', path: ['urlCta'], message: 'Requerido si configuras un botón' });
    if (!v.tipoDestinoCta) ctx.addIssue({ code: 'custom', path: ['tipoDestinoCta'], message: 'Requerido si configuras un botón' });
    if (has(v.urlCta) && !esquemaPeligroso(v.urlCta!)) {
      const url = v.urlCta!.trim();
      if (v.tipoDestinoCta === 'INTERNO' && !url.startsWith('/')) {
        ctx.addIssue({ code: 'custom', path: ['urlCta'], message: 'Una URL interna debe empezar con «/»' });
      } else if (v.tipoDestinoCta === 'EXTERNO' && !esHttps(url)) {
        ctx.addIssue({ code: 'custom', path: ['urlCta'], message: 'Una URL externa debe usar HTTPS' });
      }
    }
  }
  // Imágenes: HTTPS y alt si existe alguna.
  for (const campo of ['imagenUrlClaro', 'imagenUrlOscuro'] as const) {
    const val = v[campo];
    if (has(val) && !esquemaPeligroso(val!) && !esHttps(val!)) {
      ctx.addIssue({ code: 'custom', path: [campo], message: 'La imagen debe servirse por HTTPS' });
    }
  }
  if ((has(v.imagenUrlClaro) || has(v.imagenUrlOscuro)) && !has(v.textoAlternativoImagen)) {
    ctx.addIssue({ code: 'custom', path: ['textoAlternativoImagen'], message: 'El texto alternativo es obligatorio cuando hay imagen' });
  }
}

/** Schema para guardar BORRADOR: permite contenido incompleto. */
export const campaniaBorradorSchema = baseShape.superRefine(refinarComun);

/** Schema para PUBLICAR: validación completa. */
export const campaniaPublicacionSchema = baseShape.superRefine((v, ctx) => {
  refinarComun(v, ctx);
  refinarPublicacion(v, ctx);
});

/**
 * Lista de requisitos pendientes para publicar, DERIVADA del schema de
 * publicación (sin reglas manuales duplicadas). Devuelve mensajes únicos.
 */
export function requisitosPendientesPublicacion(values: unknown): string[] {
  const res = campaniaPublicacionSchema.safeParse(values);
  if (res.success) return [];
  return Array.from(new Set(res.error.issues.map((i) => i.message)));
}
