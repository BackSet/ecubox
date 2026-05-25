export interface CanalComunicacionItem {
  valor: string;
  visible: boolean;
}

export interface CanalesComunicacion {
  email: CanalComunicacionItem;
  telefono: CanalComunicacionItem;
  whatsapp: CanalComunicacionItem;
  facebook: CanalComunicacionItem;
  instagram: CanalComunicacionItem;
  tiktok: CanalComunicacionItem;
  youtube: CanalComunicacionItem;
  linkedin: CanalComunicacionItem;
  x: CanalComunicacionItem;
}

/** Respuesta pública: solo canales visibles con valor (sin flags). */
export interface CanalesComunicacionPublic {
  email?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  x?: string | null;
}

export type CanalComunicacionKey = keyof CanalesComunicacion;

export const CANAL_KEYS: CanalComunicacionKey[] = [
  'email',
  'telefono',
  'whatsapp',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'linkedin',
  'x',
];

export const CANAL_LABELS: Record<CanalComunicacionKey, string> = {
  email: 'Correo electrónico',
  telefono: 'Teléfono',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
};

export const CANAL_PLACEHOLDERS: Record<CanalComunicacionKey, string> = {
  email: 'soporte@ecubox.com',
  telefono: '+593 99 999 9999',
  whatsapp: 'https://wa.me/593999999999',
  facebook: 'https://facebook.com/ecubox',
  instagram: 'https://instagram.com/ecubox',
  tiktok: 'https://tiktok.com/@ecubox',
  youtube: 'https://youtube.com/@ecubox',
  linkedin: 'https://linkedin.com/company/ecubox',
  x: 'https://x.com/ecubox',
};

export function emptyCanalItem(): CanalComunicacionItem {
  return { valor: '', visible: false };
}

export function emptyCanalesComunicacion(): CanalesComunicacion {
  return {
    email: emptyCanalItem(),
    telefono: emptyCanalItem(),
    whatsapp: emptyCanalItem(),
    facebook: emptyCanalItem(),
    instagram: emptyCanalItem(),
    tiktok: emptyCanalItem(),
    youtube: emptyCanalItem(),
    linkedin: emptyCanalItem(),
    x: emptyCanalItem(),
  };
}

export function normalizeCanalesFromApi(raw: Partial<CanalesComunicacion> | null | undefined): CanalesComunicacion {
  const base = emptyCanalesComunicacion();
  if (!raw) return base;
  for (const key of CANAL_KEYS) {
    const item = raw[key];
    if (item) {
      const valor = (item.valor ?? '').trim();
      base[key] = {
        valor,
        visible: valor.length > 0 ? Boolean(item.visible) : false,
      };
    }
  }
  return base;
}

export function canalesToComparable(c: CanalesComunicacion): string {
  return JSON.stringify(c);
}

export function hasPublicCanales(c: CanalesComunicacionPublic): boolean {
  return CANAL_KEYS.some((k) => {
    const v = c[k as keyof CanalesComunicacionPublic];
    return typeof v === 'string' && v.trim().length > 0;
  });
}
