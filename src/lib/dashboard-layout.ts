export const DASHBOARD_BLOCK_KEYS = [
  "buscar-atendimento",
  "leads-por-produtor",
  "volume-leads",
  "distribuicao-atendente",
  "leads-recentes",
  "operadores",
] as const;

export type DashboardBlockKey = (typeof DASHBOARD_BLOCK_KEYS)[number];

export const DEFAULT_DASHBOARD_LAYOUT: DashboardBlockKey[] = [...DASHBOARD_BLOCK_KEYS];

function isDashboardBlockKey(value: string): value is DashboardBlockKey {
  return (DASHBOARD_BLOCK_KEYS as readonly string[]).includes(value);
}

/**
 * Drops keys that no longer exist (old saved layout) and appends any block
 * key missing from the saved order (new block added after the user last
 * customized), so the layout stays complete even as blocks change over time.
 */
export function normalizeDashboardLayout(saved: string[]): DashboardBlockKey[] {
  const known = saved.filter(isDashboardBlockKey);
  const missing = DASHBOARD_BLOCK_KEYS.filter((key) => !known.includes(key));
  return [...known, ...missing];
}
