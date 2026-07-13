/**
 * Every "today"/date-range boundary in the app must be computed in Brasília
 * time, not the server's own clock (UTC on Vercel) — otherwise "hoje" flips
 * over hours early/late relative to what a Brazilian user expects, and
 * evening sales silently get bucketed into "ontem".
 */
export const BR_TIMEZONE = "America/Sao_Paulo";

// America/Sao_Paulo is a fixed UTC-3 offset year-round (Brazil abolished DST in 2019).
const BR_OFFSET_MS = 3 * 60 * 60 * 1000;

function brShifted(date: Date): Date {
  return new Date(date.getTime() - BR_OFFSET_MS);
}

export function brDateParts(date: Date): { year: number; month: number; day: number } {
  const s = brShifted(date);
  return { year: s.getUTCFullYear(), month: s.getUTCMonth(), day: s.getUTCDate() };
}

/** "YYYY-MM-DD" as seen on a Brasília wall clock. */
export function brDateString(date: Date): string {
  const { year, month, day } = brDateParts(date);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 0 = Sunday .. 6 = Saturday, per the Brasília calendar date. */
export function brWeekday(date: Date): number {
  return brShifted(date).getUTCDay();
}

/** 0-23, per the Brasília wall clock. */
export function brHour(date: Date): number {
  return brShifted(date).getUTCHours();
}

/** Minutes are unaffected by a whole-hour offset, but exposed here for symmetry. */
export function brMinute(date: Date): number {
  return date.getUTCMinutes();
}

export function shiftDateString(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function startOfDayString(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000-03:00`);
}

export function endOfDayString(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999-03:00`);
}

export function startOfDay(date: Date): Date {
  return startOfDayString(brDateString(date));
}

export function endOfDay(date: Date): Date {
  return endOfDayString(brDateString(date));
}

export function startOfToday(): Date {
  return startOfDay(new Date());
}
