import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shiftMonth,
  isValidYMD,
  formatDisplayDate,
  formatMonthLabel,
  todayYMD,
} from './date';

test('shiftMonth crosses year boundaries accurately', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-06', -6), '2025-12');
});

test('isValidYMD validates Gregorian calendar dates strictly', () => {
  assert.equal(isValidYMD('2026-02-28'), true);
  assert.equal(isValidYMD('2026-02-29'), false);
  assert.equal(isValidYMD('2024-02-29'), true);
  assert.equal(isValidYMD('2026-13-01'), false);
});

test('formatDisplayDate does not shift calendar day across timezones', () => {
  assert.equal(formatDisplayDate('2026-03-01', 'en'), 'Mar 1, 2026');
  assert.equal(formatMonthLabel('2026-11', 'en'), 'November 2026');
});

test('todayYMD respects supplied IANA timezone', () => {
  // 2026-05-01T01:30:00Z is still 2026-04-30 in America/Los_Angeles (UTC-7)
  // and already 2026-05-01 in Asia/Baghdad (UTC+3)
  const instant = new Date('2026-05-01T01:30:00Z');
  assert.equal(todayYMD('America/Los_Angeles', instant), '2026-04-30');
  assert.equal(todayYMD('Asia/Baghdad', instant), '2026-05-01');
});
