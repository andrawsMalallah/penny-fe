export type CurrencyCode = 'IQD' | 'USD';

const DECIMAL_RE = /^(-)?(\d+)(?:\.(\d+))?$/;

/**
 * Parses a decimal string into a scaled BigInt without floating-point precision loss.
 * Returns null if the string is invalid or exceeds allowed fractional digits.
 */
export function parseDecimalToBigInt(
  raw: string | null | undefined,
  scale = 2
): bigint | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const match = DECIMAL_RE.exec(trimmed);
  if (!match) return null;

  const isNegative = Boolean(match[1]);
  const whole = match[2];
  const frac = match[3] ?? '';

  if (frac.length > scale) {
    // Allow trailing zeros beyond scale only if they are all zeros, otherwise reject
    const extra = frac.slice(scale);
    if (!/^0*$/.test(extra)) {
      return null;
    }
  }

  const paddedFrac = frac.slice(0, scale).padEnd(scale, '0');
  const combined = BigInt(whole + paddedFrac);
  return isNegative && combined !== 0n ? -combined : combined;
}

/**
 * Formats a scaled BigInt back to a canonical fixed-decimal string (e.g. "1250.50").
 */
export function formatBigIntToDecimal(value: bigint, scale = 2): string {
  const isNeg = value < 0n;
  const abs = isNeg ? -value : value;
  const factor = 10n ** BigInt(scale);
  const whole = abs / factor;
  if (scale === 0) {
    return `${isNeg && abs > 0n ? '-' : ''}${whole.toString()}`;
  }
  const frac = (abs % factor).toString().padStart(scale, '0');
  return `${isNeg && abs > 0n ? '-' : ''}${whole.toString()}.${frac}`;
}

export function addDecimals(
  a: string | null | undefined,
  b: string | null | undefined,
  scale = 2
): string {
  const ba = parseDecimalToBigInt(a ?? '0', scale) ?? 0n;
  const bb = parseDecimalToBigInt(b ?? '0', scale) ?? 0n;
  return formatBigIntToDecimal(ba + bb, scale);
}

export function subtractDecimals(
  a: string | null | undefined,
  b: string | null | undefined,
  scale = 2
): string {
  const ba = parseDecimalToBigInt(a ?? '0', scale) ?? 0n;
  const bb = parseDecimalToBigInt(b ?? '0', scale) ?? 0n;
  return formatBigIntToDecimal(ba - bb, scale);
}

export function compareDecimals(
  a: string | null | undefined,
  b: string | null | undefined,
  scale = 2
): -1 | 0 | 1 {
  const ba = parseDecimalToBigInt(a ?? '0', scale) ?? 0n;
  const bb = parseDecimalToBigInt(b ?? '0', scale) ?? 0n;
  if (ba < bb) return -1;
  if (ba > bb) return 1;
  return 0;
}

export function isPositiveDecimal(
  raw: string | null | undefined,
  scale = 2
): boolean {
  const val = parseDecimalToBigInt(raw, scale);
  return val !== null && val > 0n;
}

/**
 * Computes exact exchange received amount from source amount (2dp) and exchange rate (up to 6dp)
 * using BigInt arithmetic with half-up rounding to 2 decimal places.
 *
 * - USD -> IQD: received_iqd = amount_usd * rate
 * - IQD -> USD: received_usd = amount_iqd / rate
 */
export function computeExchangeReceived(
  amountStr: string,
  fromCurrency: CurrencyCode,
  rateStr: string
): string | null {
  const amountCents = parseDecimalToBigInt(amountStr, 2);
  const rateMicros = parseDecimalToBigInt(rateStr, 6);
  if (amountCents === null || amountCents <= 0n) return null;
  if (rateMicros === null || rateMicros <= 0n) return null;

  if (fromCurrency === 'USD') {
    // amountCents (10^-2) * rateMicros (10^-6) -> 10^-8; divide by 10^6 with half-up rounding
    const numerator = amountCents * rateMicros;
    const divisor = 1_000_000n;
    const quotient = (numerator + divisor / 2n) / divisor;
    return formatBigIntToDecimal(quotient, 2);
  } else {
    // IQD -> USD: (amountCents * 10^6) / rateMicros with half-up rounding
    const numerator = amountCents * 1_000_000n;
    const quotient = (numerator + rateMicros / 2n) / rateMicros;
    return formatBigIntToDecimal(quotient, 2);
  }
}

/**
 * Computes integer percentage (0..100+ clamped or exact) of spent/limit using BigInt.
 */
export function computePercentRatio(
  partStr: string | null | undefined,
  wholeStr: string | null | undefined
): number {
  const part = parseDecimalToBigInt(partStr ?? '0', 2) ?? 0n;
  const whole = parseDecimalToBigInt(wholeStr ?? '0', 2) ?? 0n;
  if (whole <= 0n || part <= 0n) return 0;
  const pct = (part * 100n) / whole;
  return Number(pct);
}

/**
 * Formats a monetary decimal string for display in IQD or USD with grouping separators,
 * preserving exact decimal places without floating-point conversion.
 */
export function formatMoney(
  raw: string | null | undefined,
  currency: CurrencyCode,
  locale: 'en' | 'ar' = 'en',
  options?: { showSign?: boolean }
): string {
  const cents = parseDecimalToBigInt(raw ?? '0', 2);
  if (cents === null) return raw ?? '0.00';

  const isNeg = cents < 0n;
  const abs = isNeg ? -cents : cents;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, '0');

  const wholeFormatted = addGroupingCommas(whole.toString());
  const sign = isNeg ? '-' : options?.showSign && cents > 0n ? '+' : '';

  const absFormatted =
    currency === 'IQD' && frac === '00'
      ? wholeFormatted
      : `${wholeFormatted}.${frac}`;

  if (currency === 'USD') {
    return locale === 'ar'
      ? `${sign}${absFormatted} $`
      : `${sign}$${absFormatted}`;
  }
  return locale === 'ar'
    ? `${sign}${absFormatted} د.ع`
    : `${sign}${absFormatted} IQD`;
}

function addGroupingCommas(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
