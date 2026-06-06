const DEFAULT_REVOKE_DELAY_MS = 1500;

/** Descarga un Blob y libera su URL cuando el navegador ya inició la descarga. */
export function downloadBlob(
  blob: Blob,
  filename: string,
  revokeDelayMs = DEFAULT_REVOKE_DELAY_MS,
): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), revokeDelayMs);
}
