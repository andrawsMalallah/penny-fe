import type { Currency } from './transactions'

export function receivedCurrency(currency: Currency): Currency {
  return currency === 'IQD' ? 'USD' : 'IQD'
}

export function exchangeAmount(
  amount: string,
  currency: Currency | '',
  rate: string,
): string | null {
  if (
    !/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/.test(amount) ||
    !/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(rate) ||
    !currency
  )
    return null
  const [amountWhole, amountFraction = ''] = amount.split('.')
  const [rateWhole, rateFraction = ''] = rate.split('.')
  const amountCents = BigInt(amountWhole! + amountFraction.padEnd(2, '0'))
  const rateMicros = BigInt(rateWhole! + rateFraction.padEnd(6, '0'))
  if (amountCents === 0n || rateMicros === 0n) return null
  // Work as an exact rational number of cents; half-up rounding needs no float.
  const numerator = currency === 'USD' ? amountCents * rateMicros : amountCents * 1000000n
  const denominator = currency === 'USD' ? 1000000n : rateMicros
  const receivedCents = (numerator * 2n + denominator) / (denominator * 2n)
  if (receivedCents <= 0n || receivedCents > 999999999999999999n) return null
  return `${receivedCents / 100n}.${String(receivedCents % 100n).padStart(2, '0')}`
}
