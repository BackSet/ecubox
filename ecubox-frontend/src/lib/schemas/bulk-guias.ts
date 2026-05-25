import { z } from 'zod';
import { MAX_GUIAS_BULK, MAX_NUMERO_GUIA } from './primitives';

export const guiaListItemSchema = z
  .string()
  .min(1, 'La guía no puede estar vacía')
  .max(MAX_NUMERO_GUIA, `Máximo ${MAX_NUMERO_GUIA} caracteres por guía`)
  .transform((s) => s.trim());

export const guiaListSchema = z
  .array(guiaListItemSchema)
  .max(MAX_GUIAS_BULK, `Máximo ${MAX_GUIAS_BULK} guías por operación`);

export interface ParseGuiaListResult {
  guias: string[];
  errors: string[];
  duplicates: string[];
}

export function parseGuiaList(text: string): ParseGuiaListResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const errors: string[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const guias: string[] = [];

  if (lines.length > MAX_GUIAS_BULK) {
    errors.push(`Máximo ${MAX_GUIAS_BULK} guías por operación (tienes ${lines.length})`);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > MAX_NUMERO_GUIA) {
      errors.push(`Línea ${i + 1}: máximo ${MAX_NUMERO_GUIA} caracteres`);
      continue;
    }
    const key = line.toUpperCase();
    if (seen.has(key)) {
      if (!duplicates.includes(line)) duplicates.push(line);
      continue;
    }
    seen.add(key);
    guias.push(line);
  }

  return { guias, errors, duplicates };
}

export function validateGuiaList(text: string): { ok: true; guias: string[] } | { ok: false; errors: string[] } {
  const parsed = parseGuiaList(text);
  const errors = [...parsed.errors];
  if (parsed.guias.length === 0 && errors.length === 0) {
    errors.push('Ingresa al menos una guía');
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, guias: parsed.guias };
}
