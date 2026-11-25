import assert from 'node:assert/strict';
import test from 'node:test';
import { clearCsrfToken } from './client';
import { authApi } from './endpoints';
import {
  adaptAnalytics,
  adaptBudgetRow,
  adaptDebt,
  adaptMonthlyReview,
  adaptPendingOccurrences,
  adaptRepayment,
  type BackendAnalytics,
  type BackendBudgetRow,
  type BackendDebt,
  type BackendMonthlyReview,
} from './adapters';

const emptyPage = <T>(results: T[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const budget: BackendBudgetRow = {
  category: 4,
  name_en: 'Food',
  name_ar: 'طعام',
  archived: false,
  month: '2026-11',
  version: 2,
  recurring: true,
  IQD: { limit: '1000.00', spent: '1200.00', remaining: '-200.00', over: true },
  USD: { limit: null, spent: '0.00', remaining: null, over: false },
};

test('budget rows retain exact backend money while mapping the category key', () => {
  const mapped = adaptBudgetRow(budget);
  assert.equal(mapped.category_id, 4);
  assert.equal(mapped.IQD.remaining, '-200.00');
  assert.equal(mapped.USD.limit, null);
});

test('debt status and repayment fields use actual backend responses', () => {
  const debt = {
    id: 9,
    person: 2,
    person_name: 'Friend',
    direction: 'owed_to_me',
    origin: 'movement',
    account: 1,
    account_name: 'Cash',
    currency: 'IQD',
    amount: '100.00',
    repaid: '100.00',
    remaining: '0.00',
    repayment_count: 1,
    date: '2026-11-01',
    note: '',
    version: 3,
  } satisfies BackendDebt;
  assert.equal(adaptDebt(debt).status, 'settled');
  assert.equal(adaptDebt({ ...debt, remaining: '0.01' }).status, 'open');
  assert.equal(adaptDebt(debt).total_repaid, '100.00');

  const repayment = adaptRepayment({
    id: 12,
    debt: 9,
    account: 1,
    account_name: 'Cash',
    destination: null,
    destination_name: '',
    category: null,
    kind: 'debt_in',
    currency: 'IQD',
    amount: '100.00',
    exchange_rate: null,
    received_amount: null,
    date: '2026-11-10',
    note: '',
    version: 1,
  });
  assert.equal(repayment.debt, 9);
  assert.equal(repayment.amount, '100.00');
});

test('analytics maps positions, breakdowns, and exact previous difference', () => {
  const source: BackendAnalytics = {
    period: {
      key: 'this_month',
      start: '2026-11-01',
      end: '2026-11-24',
      previous_start: '2026-10-01',
      previous_end: '2026-10-24',
      today: '2026-11-24',
    },
    current: {
      IQD: { held: '123456789012345.67', owed_to_me: '5.00', i_owe: '1.00', net: '123456789012349.67' },
      USD: { held: '10.00', owed_to_me: '0.00', i_owe: '0.00', net: '10.00' },
    },
    activity: {
      IQD: { income: '12.00', expense: '3.00', difference: '9.00', previous_income: '2.00', previous_expense: '5.00', income_change: '10.00', expense_change: '-2.00' },
      USD: { income: '0.00', expense: '0.00', difference: '0.00', previous_income: '0.00', previous_expense: '0.00', income_change: '0.00', expense_change: '0.00' },
    },
    trends: [{ month: '2026-11', IQD: { income: '12.00', expense: '3.00' }, USD: { income: '0.00', expense: '0.00' } }],
    breakdowns: {
      accounts: emptyPage([{ id: 1, name: 'Cash', archived: false, group_name: null, balance_iqd: '100.00', balance_usd: '0.00' }]),
      groups: emptyPage([{ group: null, group_name: null, IQD: '100.00', USD: '0.00' }]),
      categories: emptyPage([{ category: 4, category_name_en: 'Food', category_name_ar: 'طعام', category_archived: false, IQD: '3.00', USD: '0.00' }]),
      people: emptyPage([{ person: 2, person_name: 'Friend', owed_to_me_IQD: '5.00', owed_to_me_USD: '0.00', i_owe_IQD: '0.00', i_owe_USD: '0.00' }]),
    },
  };
  const mapped = adaptAnalytics(source);
  assert.equal(mapped.position.IQD.holdings, '123456789012345.67');
  assert.equal(mapped.flow.IQD.previous_difference, '-3.00');
  assert.equal(mapped.trend[0].IQD.difference, '9.00');
  assert.equal(mapped.groups.results[0].balance_iqd, '100.00');
  assert.equal(mapped.categories.results[0].category_id, 4);
  assert.equal(mapped.people.results[0].owed_to_me_iqd, '5.00');
});

test('monthly review and recurring pending dates map their backend keys', () => {
  const flow = { income: '10.00', expense: '4.00', difference: '6.00', previous_income: '3.00', previous_expense: '2.00', previous_difference: '1.00', income_change: '7.00', expense_change: '2.00', difference_change: '5.00' };
  const category = { category: 4, category_name_en: 'Food', category_name_ar: 'طعام', category_archived: false, IQD: '4.00', USD: '0.00' };
  const source: BackendMonthlyReview = {
    period: { month: '2026-11', start: '2026-11-01', end: '2026-11-24', previous_start: '2026-10-01', previous_end: '2026-10-24', incomplete: true },
    activity: { IQD: flow, USD: flow },
    top_categories: { IQD: [category], USD: [category] },
    budgets: emptyPage([budget]),
  };
  const mapped = adaptMonthlyReview(source);
  assert.equal(mapped.is_current_month, true);
  assert.equal(mapped.top_categories.IQD[0].spent, '4.00');
  assert.equal(mapped.budgets.results[0].category_id, 4);
  assert.deepEqual(adaptPendingOccurrences({ results: ['2026-11-24'], next_cursor: null }), {
    dates: ['2026-11-24'],
    next_cursor: null,
  });
});

test('authentication accepts the backend user object and pending factor response', async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith('/auth/csrf/')) {
      return Response.json({ csrf_token: 'test-token' });
    }
    if (url.endsWith('/auth/login/')) {
      return Response.json({ id: 1, email: 'person@example.test', display_name: 'Person', email_verified: true, language: 'en', timezone: 'Asia/Baghdad' });
    }
    if (url.endsWith('/auth/2fa/login/')) {
      return Response.json({ pending: true });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  try {
    clearCsrfToken();
    const login = await authApi.login({ email: 'person@example.test', password: 'test-password' });
    assert.equal(login.user?.display_name, 'Person');
    assert.deepEqual(await authApi.getTwoFactorLoginStatus(), { pending: true });
    assert.deepEqual(requests, ['/api/v1/auth/csrf/', '/api/v1/auth/login/', '/api/v1/auth/2fa/login/']);
  } finally {
    clearCsrfToken();
    globalThis.fetch = originalFetch;
  }
});
