export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export function inIdOrder<T>(ids: string[], rows: T[], idOf: (row: T) => string): T[] {
  const byId = new Map(rows.map((row) => [idOf(row), row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
