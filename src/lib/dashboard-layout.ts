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

export type DashboardBlockWidth = "full" | "half";

/** Matches the original hand-tuned layout: tables full-width, the two chart/stat pairs side by side. */
export const DEFAULT_DASHBOARD_WIDTHS: Record<DashboardBlockKey, DashboardBlockWidth> = {
  "buscar-atendimento": "full",
  "leads-por-produtor": "full",
  "volume-leads": "half",
  "distribuicao-atendente": "half",
  "leads-recentes": "half",
  operadores: "half",
};

export function normalizeDashboardWidths(saved: unknown): Record<DashboardBlockKey, DashboardBlockWidth> {
  const parsed = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  const widths = { ...DEFAULT_DASHBOARD_WIDTHS };
  for (const key of DASHBOARD_BLOCK_KEYS) {
    const value = parsed[key];
    if (value === "full" || value === "half") {
      widths[key] = value;
    }
  }
  return widths;
}
