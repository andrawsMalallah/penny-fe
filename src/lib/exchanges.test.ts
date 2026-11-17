import { describe, expect, it } from 'vitest'
import { exchangeAmount, receivedCurrency } from './exchanges'

describe('exact exchange preview', () => {
  it.each([
    ['1.00', 'USD', '1310', '1310.00'],
    ['1310', 'IQD', '1310', '1.00'],
    ['0.01', 'USD', '1.5', '0.02'],
    ['1', 'IQD', '200', '0.01'],
    ['1', 'IQD', '3', '0.33'],
    ['1', 'USD', '1.004999', '1.00'],
    ['1', 'USD', '1.005', '1.01'],
    ['9999999999999999.99', 'USD', '1', '9999999999999999.99'],
    ['0.01', 'USD', '999999999999.999999', '10000000000.00'],
  ] as const)('converts %s %s at %s', (amount, currency, rate, result) => {
    expect(exchangeAmount(amount, currency, rate)).toBe(result)
  })
  it.each([
    ['0', '1'],
    ['-1', '1'],
    ['1.001', '1'],
    ['1', '0'],
    ['1', '-1'],
    ['1', '1.1234567'],
    ['1', '1000000000000'],
    ['NaN', '1'],
    ['0.01', '0.000001'],
    ['9999999999999999.99', '2'],
  ])('rejects unsupported amount/rate %s at %s', (amount, rate) => {
    expect(exchangeAmount(amount!, 'USD', rate!)).toBeNull()
  })
  it('requires a currency and supports only opposite IQD/USD balances', () => {
    expect(exchangeAmount('1', '', '1310')).toBeNull()
    expect(exchangeAmount('0.01', 'IQD', '1310')).toBeNull()
    expect(receivedCurrency('IQD')).toBe('USD')
    expect(receivedCurrency('USD')).toBe('IQD')
  })
})
