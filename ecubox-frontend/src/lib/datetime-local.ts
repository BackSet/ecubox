/**
 * Serializa el valor de `<input type="datetime-local">` para enviarlo al API.
 *
 * **No** usar `Date#toISOString()`: convierte a UTC y puede cambiar el día
 * calendario respecto a lo que el usuario eligió (p. ej. Ecuador UTC-5 por la
 * tarde/noche pasa a "mañana" en UTC).
 *
 * El backend deserializa como {@code LocalDateTime} sin zona: la hora es la
 * misma que mostró el picker (hora local del usuario).
 */
export function localDateTimeInputToApi(value: string | undefined): string | undefined {
  if (value == null || !value.trim()) return undefined;
  const v = value.trim();
  return v.length === 16 ? `${v}:00` : v;
}
