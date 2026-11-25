import type {
  AccountBreakdownRow,
  AnalyticsSummaryResponse,
  BudgetRow,
  CategoryBreakdownRow,
  CurrencyFlowSummary,
  Debt,
  GroupBreakdownRow,
  MonthlyReviewResponse,
  PaginatedResponse,
  PendingOccurrencesResponse,
  PersonDebtBreakdownRow,
  Repayment,
  Transaction,
} from './types';
import type { CurrencyCode } from '../utils/money';
import { compareDecimals, subtractDecimals } from '../utils/money';

type CurrencyMap<Value> = Record<CurrencyCode, Value>;

export type BackendBudgetRow = Omit<BudgetRow, 'category_id'> & { category: number };
export type BackendDebt = Omit<Debt, 'total_repaid' | 'status'> & { repaid: string };

type BackendPeriod = {
  key: AnalyticsSummaryResponse['period'];
  start: string;
  end: string;
  previous_start: string;
  previous_end: string;
  today: string;
};

type BackendFlow = CurrencyFlowSummary & {
  previous_income: string;
  previous_expense: string;
};

type BackendAccountBreakdown = Omit<AccountBreakdownRow, 'group_name'> & {
  group_name: string | null;
};
type BackendGroupBreakdown = {
  group: number | null;
  group_name: string | null;
  IQD: string;
  USD: string;
};
type BackendCategoryBreakdown = {
  category: number;
  category_name_en: string;
  category_name_ar: string;
  category_archived: boolean;
  IQD: string;
  USD: string;
};
type BackendPersonBreakdown = {
  person: number;
  person_name: string;
  owed_to_me_IQD: string;
  owed_to_me_USD: string;
  i_owe_IQD: string;
  i_owe_USD: string;
};

export type BackendAnalytics = {
  period: BackendPeriod;
  current: CurrencyMap<{ held: string; owed_to_me: string; i_owe: string; net: string }>;
  activity: CurrencyMap<BackendFlow>;
  trends: Array<{
    month: string;
    IQD: { income: string; expense: string };
    USD: { income: string; expense: string };
  }>;
  breakdowns: {
    accounts: PaginatedResponse<BackendAccountBreakdown>;
    groups: PaginatedResponse<BackendGroupBreakdown>;
    categories: PaginatedResponse<BackendCategoryBreakdown>;
    people: PaginatedResponse<BackendPersonBreakdown>;
  };
};

export type BackendMonthlyReview = {
  period: {
    month: string;
    start: string;
    end: string;
    previous_start: string;
    previous_end: string;
    incomplete: boolean;
  };
  activity: CurrencyMap<BackendFlow & { previous_difference: string; difference_change: string }>;
  top_categories: CurrencyMap<BackendCategoryBreakdown[]>;
  budgets: PaginatedResponse<BackendBudgetRow>;
};

function mapPage<Input, Output>(
  page: PaginatedResponse<Input>,
  mapRow: (row: Input) => Output
): PaginatedResponse<Output> {
  return { ...page, results: page.results.map(mapRow) };
}

export function adaptBudgetRow(row: BackendBudgetRow): BudgetRow {
  const { category, ...rest } = row;
  return { ...rest, category_id: category };
}

export function adaptBudgetPage(page: PaginatedResponse<BackendBudgetRow>): PaginatedResponse<BudgetRow> {
  return mapPage(page, adaptBudgetRow);
}

export function adaptDebt(row: BackendDebt): Debt {
  const { repaid, ...rest } = row;
  return {
    ...rest,
    total_repaid: repaid,
    status: compareDecimals(row.remaining, '0.00') === 0 ? 'settled' : 'open',
  };
}

export function adaptDebtPage(page: PaginatedResponse<BackendDebt>): PaginatedResponse<Debt> {
  return mapPage(page, adaptDebt);
}

export function adaptRepayment(transaction: Transaction): Repayment {
  return {
    id: transaction.id,
    debt: transaction.debt!,
    account: transaction.account,
    account_name: transaction.account_name,
    account_archived: transaction.account_archived,
    amount: transaction.amount,
    date: transaction.date,
    note: transaction.note,
    version: transaction.version,
  };
}

export function adaptRepaymentPage(page: PaginatedResponse<Transaction>): PaginatedResponse<Repayment> {
  return mapPage(page, adaptRepayment);
}

export function adaptPendingOccurrences(response: {
  results: string[];
  next_cursor: string | null;
}): PendingOccurrencesResponse {
  return { dates: response.results, next_cursor: response.next_cursor };
}

export function adaptAccountBreakdownPage(
  page: PaginatedResponse<BackendAccountBreakdown>
): PaginatedResponse<AccountBreakdownRow> {
  return page;
}

export function adaptGroupBreakdownPage(
  page: PaginatedResponse<BackendGroupBreakdown>
): PaginatedResponse<GroupBreakdownRow> {
  return mapPage(page, (row) => ({
    id: row.group,
    name: row.group_name,
    balance_iqd: row.IQD,
    balance_usd: row.USD,
  }));
}

export function adaptCategoryBreakdownPage(
  page: PaginatedResponse<BackendCategoryBreakdown>
): PaginatedResponse<CategoryBreakdownRow> {
  return mapPage(page, (row) => ({
    category_id: row.category,
    name_en: row.category_name_en,
    name_ar: row.category_name_ar,
    archived: row.category_archived,
    spent_iqd: row.IQD,
    spent_usd: row.USD,
  }));
}

export function adaptPersonBreakdownPage(
  page: PaginatedResponse<BackendPersonBreakdown>
): PaginatedResponse<PersonDebtBreakdownRow> {
  return mapPage(page, (row) => ({
    person_id: row.person,
    person_name: row.person_name,
    owed_to_me_iqd: row.owed_to_me_IQD,
    owed_to_me_usd: row.owed_to_me_USD,
    i_owe_iqd: row.i_owe_IQD,
    i_owe_usd: row.i_owe_USD,
  }));
}

export function adaptAnalytics(response: BackendAnalytics): AnalyticsSummaryResponse {
  const flow = (currency: CurrencyCode): CurrencyFlowSummary => ({
    ...response.activity[currency],
    previous_difference: subtractDecimals(
      response.activity[currency].previous_income,
      response.activity[currency].previous_expense
    ),
  });
  return {
    period: response.period.key,
    start: response.period.start,
    end: response.period.end,
    previous_start: response.period.previous_start,
    previous_end: response.period.previous_end,
    position: {
      IQD: {
        holdings: response.current.IQD.held,
        owed_to_me: response.current.IQD.owed_to_me,
        i_owe: response.current.IQD.i_owe,
        net_position: response.current.IQD.net,
      },
      USD: {
        holdings: response.current.USD.held,
        owed_to_me: response.current.USD.owed_to_me,
        i_owe: response.current.USD.i_owe,
        net_position: response.current.USD.net,
      },
    },
    flow: { IQD: flow('IQD'), USD: flow('USD') },
    trend: response.trends.map((month) => ({
      month: month.month,
      IQD: {
        ...month.IQD,
        difference: subtractDecimals(month.IQD.income, month.IQD.expense),
      },
      USD: {
        ...month.USD,
        difference: subtractDecimals(month.USD.income, month.USD.expense),
      },
    })),
    accounts: adaptAccountBreakdownPage(response.breakdowns.accounts),
    groups: adaptGroupBreakdownPage(response.breakdowns.groups),
    categories: adaptCategoryBreakdownPage(response.breakdowns.categories),
    people: adaptPersonBreakdownPage(response.breakdowns.people),
  };
}

export function adaptMonthlyReview(response: BackendMonthlyReview): MonthlyReviewResponse {
  const topCategories = (currency: CurrencyCode) =>
    response.top_categories[currency].map((row) => ({
      category_id: row.category,
      name_en: row.category_name_en,
      name_ar: row.category_name_ar,
      archived: row.category_archived,
      spent: row[currency],
    }));
  return {
    month: response.period.month,
    previous_month: response.period.previous_start.slice(0, 7),
    start: response.period.start,
    end: response.period.end,
    previous_start: response.period.previous_start,
    previous_end: response.period.previous_end,
    is_current_month: response.period.incomplete,
    flow: response.activity,
    top_categories: {
      IQD: topCategories('IQD'),
      USD: topCategories('USD'),
    },
    budgets: adaptBudgetPage(response.budgets),
  };
}
