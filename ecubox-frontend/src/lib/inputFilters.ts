import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

const ALLOWED_KEYS = new Set([
  'Backspace',
  'Tab',
  'Delete',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

function isModifierKey(e: ReactKeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey;
}

/** Bloquea teclas que no sean dígitos 0-9. Permite navegación y atajos Ctrl/Cmd+A/C/V/X. */
export function onKeyDownNumeric(e: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void {
  if (ALLOWED_KEYS.has(e.key)) return;
  if (isModifierKey(e) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
  if (/^[0-9]$/.test(e.key)) return;
  e.preventDefault();
}

/** Bloquea teclas que no sean dígitos o un único separador decimal (.). Permite navegación y atajos. */
export function onKeyDownNumericDecimal(
  e: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  currentValue?: string
): void {
  if (ALLOWED_KEYS.has(e.key)) return;
  if (isModifierKey(e) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
  if (/^[0-9]$/.test(e.key)) return;
  const val = currentValue ?? (e.target as HTMLInputElement).value ?? '';
  const hasDecimal = /[.,]/.test(val);
  if ((e.key === '.' || e.key === ',') && !hasDecimal) return;
  e.preventDefault();
}

/** Deja solo dígitos en la cadena. */
export function sanitizeNumeric(value: string): string {
  return value.replace(/\D/g, '');
}

/** Deja solo dígitos y un único separador decimal (normalizado a .). */
export function sanitizeNumericDecimal(value: string, decimalSeparator = '.'): string {
  const normalized = value.replace(',', '.');
  const hasTrailingDecimal = normalized.endsWith('.');
  const parts = normalized.split('.');
  if (parts.length <= 1) return sanitizeNumeric(normalized);
  const [intPart, ...decParts] = parts;
  const decPart = decParts.join('');
  const intClean = intPart.replace(/\D/g, '');
  const decClean = decPart.replace(/\D/g, '').slice(0, 10);
  if (decClean === '') {
    return hasTrailingDecimal ? `${intClean}${decimalSeparator}` : intClean;
  }
  return `${intClean}${decimalSeparator}${decClean}`;
}

/** Bloquea teclas que no sean letras (incl. con acentos) ni espacio. Permite navegación y atajos. */
export function onKeyDownLetters(e: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void {
  if (ALLOWED_KEYS.has(e.key)) return;
  if (isModifierKey(e) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
  if (e.key === ' ') return;
  if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]$/.test(e.key)) return;
  e.preventDefault();
}

/** Elimina dígitos de la cadena (solo letras y espacios). */
export function sanitizeLetters(value: string): string {
  return value.replace(/[0-9]/g, '');
}
