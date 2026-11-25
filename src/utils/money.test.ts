import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDecimalToBigInt,
  formatBigIntToDecimal,
  addDecimals,
  subtractDecimals,
  compareDecimals,
  computeExchangeReceived,
  computePercentRatio,
  formatMoney,
} from './money';

test('parseDecimalToBigInt handles exact cents and rejects excess precision', () => {
  assert.equal(parseDecimalToBigInt('123.45', 2), 12345n);
  assert.equal(parseDecimalToBigInt('123.4', 2), 12340n);
  assert.equal(parseDecimalToBigInt('123', 2), 12300n);
  assert.equal(parseDecimalToBigInt('-50.25', 2), -5025n);
  assert.equal(parseDecimalToBigInt('0.00', 2), 0n);
  assert.equal(parseDecimalToBigInt('12.345', 2), null);
  assert.equal(parseDecimalToBigInt('12.3400', 2), 1234n);
  assert.equal(parseDecimalToBigInt('abc', 2), null);
});

test('BigInt arithmetic avoids IEEE-754 float drift', () => {
  assert.equal(addDecimals('0.10', '0.20'), '0.30');
  assert.equal(subtractDecimals('1000000000.00', '0.01'), '999999999.99');
  assert.equal(compareDecimals('1500.50', '1500.5'), 0);
  assert.equal(compareDecimals('1500.49', '1500.50'), -1);
  assert.equal(compareDecimals('1500.51', '1500.50'), 1);
  assert.equal(formatBigIntToDecimal(-5n, 2), '-0.05');
});

test('computeExchangeReceived calculates USD<->IQD with 6dp rates accurately', () => {
  assert.equal(computeExchangeReceived('100.00', 'USD', '1310.000000'), '131000.00');
  assert.equal(computeExchangeReceived('131000.00', 'IQD', '1310.000000'), '100.00');
  assert.equal(computeExchangeReceived('50.00', 'USD', '1505.25'), '75262.50');
  assert.equal(computeExchangeReceived('0', 'USD', '1310'), null);
});

test('computePercentRatio and formatMoney format IQD and USD cleanly', () => {
  assert.equal(computePercentRatio('75.00', '100.00'), 75);
  assert.equal(computePercentRatio('125.00', '100.00'), 125);
  assert.equal(computePercentRatio('10.00', '0.00'), 0);

  assert.equal(formatMoney('1500000.00', 'IQD', 'en'), '1,500,000 IQD');
  assert.equal(formatMoney('1500000.50', 'IQD', 'en'), '1,500,000.50 IQD');
  assert.equal(formatMoney('1250.50', 'USD', 'en'), '$1,250.50');
  assert.equal(formatMoney('-42.10', 'USD', 'en'), '-$42.10');
  assert.equal(formatMoney('500.00', 'USD', 'en', { showSign: true }), '+$500.00');
  assert.equal(formatMoney('25000.00', 'IQD', 'ar'), '25,000 د.ع');
});
