/**
 * Safe date-only formatting utilities.
 * 
 * Date-only strings like "2024-01-15" are parsed by `new Date()` as UTC midnight,
 * which causes a 1-day shift in timezones behind UTC when rendered via toLocaleDateString().
 * 
 * These helpers parse date-only strings by splitting components to avoid timezone issues.
 */

/**
 * Parse a date-only string (YYYY-MM-DD) into a local-midnight Date object.
 * Falls back to new Date() for datetime strings or other formats.
 */
export function parseDateOnly(dateStr: string): Date {
  // Match YYYY-MM-DD (no time component)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(dateStr);
}

/**
 * Format a date-only string (YYYY-MM-DD) to Russian locale without timezone shift.
 */
export function formatDateSafe(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseDateOnly(dateStr);
  return date.toLocaleDateString('ru-RU', options);
}
