/** Bound query offsets and reject values such as Infinity before database access. */
export function parsePageNumber(value?: string | null): number {
  const page = Number(value)
  return Number.isFinite(page) && page >= 1 ? Math.min(10000, Math.floor(page)) : 1
}
