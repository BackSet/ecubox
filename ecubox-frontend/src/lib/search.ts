export function createContainsMatcher(rawQuery: string): ((value: string | undefined | null) => boolean) | null {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return null;
  return (value) => (value ?? '').toLowerCase().includes(query);
}
