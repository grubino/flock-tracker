/**
 * Formats a date string (YYYY-MM-DD) to a localized date string without timezone conversion.
 *
 * This is important for dates (not datetimes) because new Date("2025-03-25") interprets
 * the string as midnight UTC, which can display as the previous day in timezones west of UTC.
 *
 * @param dateString - ISO date string in YYYY-MM-DD format
 * @returns Formatted date string in locale format (e.g., "03/25/2025" in US)
 */
export function formatDateWithoutTimezone(dateString: string | undefined | null): string {
  if (!dateString) return '';

  // Parse the date components directly without creating a Date object
  const [year, month, day] = dateString.split('T')[0].split('-');

  // Create a Date object using local timezone (not UTC)
  // Note: month is 0-indexed in JavaScript Date constructor
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

  return date.toLocaleDateString();
}

/**
 * Compares two date strings (YYYY-MM-DD) without timezone conversion.
 *
 * @param date1 - First date string
 * @param date2 - Second date string
 * @returns Negative if date1 < date2, positive if date1 > date2, 0 if equal
 */
export function compareDateStrings(date1: string, date2: string): number {
  // Direct string comparison works for YYYY-MM-DD format
  return date1.localeCompare(date2);
}

/**
 * Parses a date string to a Date object in local timezone.
 *
 * @param dateString - ISO date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export function parseDateWithoutTimezone(dateString: string): Date {
  const [year, month, day] = dateString.split('T')[0].split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}
