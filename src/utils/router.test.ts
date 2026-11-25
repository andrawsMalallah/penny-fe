import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHashRoute,
  buildHashRoute,
  DEFAULT_ACTIVITY_FILTERS,
} from './router';

test('parseHashRoute parses activity filters and pagination', () => {
  const parsed = parseHashRoute(
    '#activity?account=4&kind=expense&currency=IQD&start=2026-01-01&end=2026-01-31&page=3'
  );
  assert.equal(parsed.name, 'activity');
  assert.deepEqual(parsed.activity, {
    account: '4',
    category: '',
    kind: 'expense',
    currency: 'IQD',
    start: '2026-01-01',
    end: '2026-01-31',
    page: 3,
  });
});

test('parseHashRoute parses debt detail ID and budget month', () => {
  const debt = parseHashRoute('#debts/42');
  assert.equal(debt.name, 'debt-detail');
  assert.equal(debt.debtId, 42);

  const budget = parseHashRoute('#budgets?month=2026-11');
  assert.equal(budget.name, 'budgets');
  assert.equal(budget.month, '2026-11');
});

test('buildHashRoute round-trips cleanly', () => {
  const hash = buildHashRoute({
    name: 'activity',
    activity: {
      ...DEFAULT_ACTIVITY_FILTERS,
      currency: 'USD',
      kind: 'transfer',
      page: 2,
    },
  });
  assert.equal(hash, '#activity?kind=transfer&currency=USD&page=2');
  assert.deepEqual(parseHashRoute(hash).activity, {
    ...DEFAULT_ACTIVITY_FILTERS,
    currency: 'USD',
    kind: 'transfer',
    page: 2,
  });
});
