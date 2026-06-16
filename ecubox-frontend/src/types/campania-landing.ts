export type EstadoCampaniaLanding = 'BORRADOR' | 'PUBLICADA' | 'INACTIVA';
export type TipoCampaniaLanding = 'OFERTA' | 'INFORMACION' | 'NOVEDAD' | 'AVISO';
export type TipoDestinoCta = 'INTERNO' | 'EXTERNO';
export type VigenciaCampaniaLanding = 'PROGRAMADA' | 'VIGENTE' | 'VENCIDA';

/** Vista administrativa completa de una campaña de la landing. */
export interface CampaniaLanding {
  id: number;
  codigo: string;
  nombreInterno: string;
  estado: EstadoCampaniaLanding;
  vigencia?: VigenciaCampaniaLanding | null;
  tipo: TipoCampaniaLanding;
  etiqueta?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  textoCta?: string | null;
  urlCta?: string | null;
  tipoDestinoCta?: TipoDestinoCta | null;
  imagenUrlClaro?: string | null;
  imagenUrlOscuro?: string | null;
  textoAlternativoImagen?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  publicadaAt?: string | null;
  publicadaPor?: number | null;
  publicadaPorNombre?: string | null;
  creadaAt?: string | null;
  creadaPor?: number | null;
  actualizadaAt?: string | null;
  actualizadaPor?: number | null;
  actualizadaPorNombre?: string | null;
  version?: number | null;
}

/** Cuerpo de creación/actualización. */
export interface CampaniaLandingRequest {
  nombreInterno: string;
  tipo: TipoCampaniaLanding;
  etiqueta?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  textoCta?: string | null;
  urlCta?: string | null;
  tipoDestinoCta?: TipoDestinoCta | null;
  imagenUrlClaro?: string | null;
  imagenUrlOscuro?: string | null;
  textoAlternativoImagen?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  version?: number | null;
}

/** Proyección pública (solo campos visibles, sin auditoría ni estado técnico). */
export interface CampaniaLandingPublic {
  codigo?: string | null;
  tipo?: TipoCampaniaLanding | null;
  etiqueta?: string | null;
  titulo?: string | null;
  descripcion?: string | null;
  textoCta?: string | null;
  urlCta?: string | null;
  tipoDestinoCta?: TipoDestinoCta | null;
  imagenUrlClaro?: string | null;
  imagenUrlOscuro?: string | null;
  textoAlternativoImagen?: string | null;
}

/** Una campaña pública es "presente" cuando trae al menos título. */
export function hayCampaniaPublica(c: CampaniaLandingPublic | null | undefined): boolean {
  return !!c && typeof c.titulo === 'string' && c.titulo.trim().length > 0;
}

/**
 * Resuelve la imagen a mostrar según el tema efectivo, con fallback
 * bidireccional: en oscuro usa la oscura (o la clara si falta), en claro usa la
 * clara (o la oscura si falta). Devuelve también si está usando el fallback
 * (para avisos en el editor). El tema NO se resuelve en backend.
 */
export function resolverImagenCampania(
  c: Pick<CampaniaLandingPublic, 'imagenUrlClaro' | 'imagenUrlOscuro'> | null | undefined,
  tema: 'light' | 'dark',
): { url: string | null; usandoFallback: boolean } {
  const claro = c?.imagenUrlClaro?.trim() || null;
  const oscuro = c?.imagenUrlOscuro?.trim() || null;
  if (tema === 'dark') {
    return { url: oscuro ?? claro, usandoFallback: !oscuro && !!claro };
  }
  return { url: claro ?? oscuro, usandoFallback: !claro && !!oscuro };
}
