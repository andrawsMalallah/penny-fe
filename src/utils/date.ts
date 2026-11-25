const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YM_RE = /^(\d{4})-(\d{2})$/;

export function getDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Returns today's Gregorian YYYY-MM-DD in the supplied IANA timezone without UTC day-shift bugs.
 */
export function todayYMD(timezone = getDeviceTimezone(), now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // Fallback to local calendar fields
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function currentMonthYM(timezone = getDeviceTimezone(), now = new Date()): string {
  return todayYMD(timezone, now).slice(0, 7);
}

export function shiftMonth(ym: string, deltaMonths: number): string {
  const match = YM_RE.exec(ym.trim());
  if (!match) return ym;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const total = year * 12 + monthIdx + deltaMonths;
  const nextYear = Math.floor(total / 12);
  const nextMonth = ((total % 12) + 12) % 12;
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth + 1).padStart(2, '0')}`;
}

export function isValidYMD(ymd: string): boolean {
  const m = YMD_RE.exec(ymd);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}

/**
 * Formats a YYYY-MM-DD calendar date in Gregorian calendar for en or ar without UTC day shifting.
 */
export function formatDisplayDate(ymd: string | null | undefined, locale: 'en' | 'ar' = 'en'): string {
  if (!ymd) return '—';
  const match = YMD_RE.exec(ymd.trim());
  if (!match) return ymd;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const intlLocale = locale === 'ar' ? 'ar-IQ-u-ca-gregory' : 'en-US';
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(utcNoon);
}

export function formatMonthLabel(ym: string | null | undefined, locale: 'en' | 'ar' = 'en'): string {
  if (!ym) return '—';
  const match = YM_RE.exec(ym.trim());
  if (!match) return ym;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const utcNoon = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
  const intlLocale = locale === 'ar' ? 'ar-IQ-u-ca-gregory' : 'en-US';
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
  }).format(utcNoon);
}

export function formatDisplayDateTime(
  iso: string | null | undefined,
  locale: 'en' | 'ar' = 'en',
  timezone = getDeviceTimezone()
): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const intlLocale = locale === 'ar' ? 'ar-IQ-u-ca-gregory' : 'en-US';
  try {
    return new Intl.DateTimeFormat(intlLocale, {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
