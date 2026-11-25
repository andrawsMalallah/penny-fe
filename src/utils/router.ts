import type { CurrencyCode } from './money';

export type AppRouteName =
  | 'overview'
  | 'activity'
  | 'accounts'
  | 'debts'
  | 'debt-detail'
  | 'budgets'
  | 'recurring'
  | 'analytics'
  | 'monthly'
  | 'settings';

export interface ActivityFilters {
  account: string;
  category: string;
  kind: string;
  currency: '' | CurrencyCode;
  start: string;
  end: string;
  page: number;
}

export interface ParsedRoute {
  name: AppRouteName;
  debtId?: number;
  month?: string;
  activity: ActivityFilters;
}

export const DEFAULT_ACTIVITY_FILTERS: ActivityFilters = {
  account: '',
  category: '',
  kind: '',
  currency: '',
  start: '',
  end: '',
  page: 1,
};

export function parseHashRoute(hash: string): ParsedRoute {
  const cleaned = hash.replace(/^#\/?/, '').trim();
  if (!cleaned) {
    return { name: 'overview', activity: { ...DEFAULT_ACTIVITY_FILTERS } };
  }

  const [rawPath, rawQuery = ''] = cleaned.split('?');
  const path = rawPath.replace(/\/+$/, '').toLowerCase();
  const params = new URLSearchParams(rawQuery);

  const debtMatch = /^debts\/(\d+)$/.exec(path);
  if (debtMatch) {
    return {
      name: 'debt-detail',
      debtId: Number(debtMatch[1]),
      activity: { ...DEFAULT_ACTIVITY_FILTERS },
    };
  }

  if (path === 'activity') {
    const pageNum = Number(params.get('page') || '1');
    const currencyRaw = params.get('currency') || '';
    const currency = currencyRaw === 'IQD' || currencyRaw === 'USD' ? currencyRaw : '';
    return {
      name: 'activity',
      activity: {
        account: params.get('account') || '',
        category: params.get('category') || '',
        kind: params.get('kind') || '',
        currency,
        start: params.get('start') || '',
        end: params.get('end') || '',
        page: Number.isFinite(pageNum) && pageNum >= 1 ? Math.floor(pageNum) : 1,
      },
    };
  }

  if (path === 'budgets') {
    return {
      name: 'budgets',
      month: params.get('month') || undefined,
      activity: { ...DEFAULT_ACTIVITY_FILTERS },
    };
  }

  if (path === 'monthly') {
    return {
      name: 'monthly',
      month: params.get('month') || undefined,
      activity: { ...DEFAULT_ACTIVITY_FILTERS },
    };
  }

  const simpleRoutes: AppRouteName[] = [
    'overview',
    'accounts',
    'debts',
    'recurring',
    'analytics',
    'settings',
  ];
  const matched = simpleRoutes.find((r) => r === path);
  return {
    name: matched ?? 'overview',
    activity: { ...DEFAULT_ACTIVITY_FILTERS },
  };
}

export function buildHashRoute(route: Partial<ParsedRoute> & { name: AppRouteName }): string {
  if (route.name === 'debt-detail' && route.debtId) {
    return `#debts/${route.debtId}`;
  }

  if (route.name === 'activity') {
    const f = route.activity ?? DEFAULT_ACTIVITY_FILTERS;
    const params = new URLSearchParams();
    if (f.account) params.set('account', f.account);
    if (f.category) params.set('category', f.category);
    if (f.kind) params.set('kind', f.kind);
    if (f.currency) params.set('currency', f.currency);
    if (f.start) params.set('start', f.start);
    if (f.end) params.set('end', f.end);
    if (f.page > 1) params.set('page', String(f.page));
    const qs = params.toString();
    return qs ? `#activity?${qs}` : '#activity';
  }

  if ((route.name === 'budgets' || route.name === 'monthly') && route.month) {
    return `#${route.name}?month=${encodeURIComponent(route.month)}`;
  }

  return `#${route.name}`;
}
