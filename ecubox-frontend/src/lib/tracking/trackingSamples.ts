export function normalizeTrackingSampleCodigo(raw: string): string {
  return raw
    .trim()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ');
}
