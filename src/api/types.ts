import type { CurrencyCode } from '../utils/money';

export type LanguageCode = 'en' | 'ar';
export type AppearancePreference = 'system' | 'light' | 'dark';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface UserProfile {
  id: number;
  display_name: string;
  email: string;
  language: LanguageCode;
  timezone?: string;
  email_verified?: boolean;
}

export interface SessionResponse {
  user: UserProfile | null;
  two_factor_pending: boolean;
}

export interface UserSessionItem {
  id?: number | string;
  browser: string;
  device: string;
  signed_in_at: string;
  last_active_at: string;
  is_current: boolean;
}

export interface UserSettings {
  default_account: number | null;
  language: LanguageCode;
  default_currency: '' | CurrencyCode;
  exchange_rate: string | null;
}

export interface TwoFactorStatus {
  enabled: boolean;
  recovery_remaining: number;
}

export interface TwoFactorSetupPayload {
  secret: string;
  qr_code: string;
}

export interface AccountGroup {
  id: number;
  name: string;
  archived: boolean;
  created_at?: string;
}

export interface AccountOpening {
  iqd: string;
  usd: string;
  recorded_at: string;
  effective_date: string;
}

export interface Account {
  id: number;
  name: string;
  group: number | null;
  group_name: string | null;
  archived: boolean;
  created_at: string;
  balance_iqd: string;
  balance_usd: string;
  target_iqd: string | null;
  target_usd: string | null;
  target_version: number;
  opening: AccountOpening;
}

export interface ExpenseCategory {
  id: number;
  name_en: string;
  name_ar: string;
  archived: boolean;
  created_at?: string;
}

export interface DebtPerson {
  id: number;
  name: string;
  archived?: boolean;
  created_at?: string;
}

export type TransactionKind =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'exchange'
  | 'debt_in'
  | 'debt_out';

export interface Transaction {
  id: number;
  account: number;
  account_name: string;
  account_archived?: boolean;
  account_opening_date?: string;
  destination: number | null;
  destination_name: string | null;
  destination_archived?: boolean;
  destination_opening_date?: string | null;
  category: number | null;
  category_name_en?: string | null;
  category_name_ar?: string | null;
  category_name?: string | null;
  category_archived?: boolean;
  kind: TransactionKind;
  currency: CurrencyCode;
  amount: string;
  exchange_rate: string | null;
  received_amount: string | null;
  date: string;
  note: string;
  debt?: number | null;
  debt_role?: 'principal' | 'repayment' | null;
  debt_person_name?: string | null;
  version: number;
  created_at?: string;
}

export type DebtDirection = 'owed_to_me' | 'i_owe';
export type DebtOrigin = 'existing' | 'movement';
export type DebtStatus = 'open' | 'settled';

export interface Debt {
  id: number;
  person: number;
  person_name: string;
  direction: DebtDirection;
  origin: DebtOrigin;
  account: number | null;
  account_name: string | null;
  account_archived?: boolean;
  currency: CurrencyCode;
  amount: string;
  total_repaid: string;
  remaining: string;
  repayment_count: number;
  status: DebtStatus;
  date: string;
  note: string;
  version: number;
  created_at?: string;
}

export interface Repayment {
  id: number;
  debt: number;
  account: number;
  account_name: string;
  account_archived?: boolean;
  amount: string;
  date: string;
  note: string;
  version: number;
  created_at?: string;
}

export interface BudgetCurrencyRow {
  limit: string | null;
  spent: string;
  remaining: string | null;
  over: boolean;
}

export interface BudgetRow {
  category_id: number;
  name_en: string;
  name_ar: string;
  archived: boolean;
  month: string;
  version: number;
  recurring: boolean;
  IQD: BudgetCurrencyRow;
  USD: BudgetCurrencyRow;
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';
export type RecurringState = 'active' | 'paused' | 'stopped';

export interface RecurringPlan {
  id: number;
  name: string;
  kind: 'income' | 'expense';
  account: number;
  account_name: string;
  account_archived?: boolean;
  category: number | null;
  category_name_en?: string | null;
  category_name_ar?: string | null;
  category_name?: string | null;
  category_archived?: boolean;
  currency: CurrencyCode;
  amount: string;
  note: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  state: RecurringState;
  version: number;
  created_at?: string;
}

export interface PendingOccurrencesResponse {
  dates: string[];
  next_cursor: string | null;
}

export type AnalyticsPeriod = 'this_month' | 'previous_month' | 'this_year' | 'custom';

export interface CurrencyFlowSummary {
  income: string;
  expense: string;
  difference: string;
  previous_income?: string;
  previous_expense?: string;
  previous_difference?: string;
  income_change?: string;
  expense_change?: string;
  difference_change?: string;
}

export interface CurrencyPositionSummary {
  holdings: string;
  owed_to_me: string;
  i_owe: string;
  net_position: string;
}

export interface AnalyticsTrendPoint {
  month: string;
  IQD: { income: string; expense: string; difference: string };
  USD: { income: string; expense: string; difference: string };
}

export interface AccountBreakdownRow {
  id: number;
  name: string;
  group_name: string | null;
  archived: boolean;
  balance_iqd: string;
  balance_usd: string;
}

export interface GroupBreakdownRow {
  id: number | null;
  name: string | null;
  archived?: boolean;
  balance_iqd: string;
  balance_usd: string;
  account_count?: number;
}

export interface CategoryBreakdownRow {
  category_id: number;
  name_en: string;
  name_ar: string;
  archived: boolean;
  spent_iqd: string;
  spent_usd: string;
}

export interface PersonDebtBreakdownRow {
  person_id: number;
  person_name: string;
  owed_to_me_iqd: string;
  owed_to_me_usd: string;
  i_owe_iqd: string;
  i_owe_usd: string;
}

export interface AnalyticsSummaryResponse {
  period: AnalyticsPeriod;
  start: string;
  end: string;
  previous_start: string;
  previous_end: string;
  position: {
    IQD: CurrencyPositionSummary;
    USD: CurrencyPositionSummary;
  };
  flow: {
    IQD: CurrencyFlowSummary;
    USD: CurrencyFlowSummary;
  };
  trend: AnalyticsTrendPoint[];
  accounts: PaginatedResponse<AccountBreakdownRow>;
  groups: PaginatedResponse<GroupBreakdownRow>;
  categories: PaginatedResponse<CategoryBreakdownRow>;
  people: PaginatedResponse<PersonDebtBreakdownRow>;
}

export interface MonthlyReviewResponse {
  month: string;
  previous_month: string;
  start: string;
  end: string;
  previous_start: string;
  previous_end: string;
  is_current_month?: boolean;
  flow: {
    IQD: CurrencyFlowSummary;
    USD: CurrencyFlowSummary;
  };
  top_categories: {
    IQD: Array<{
      category_id: number;
      name_en: string;
      name_ar: string;
      archived?: boolean;
      spent: string;
    }>;
    USD: Array<{
      category_id: number;
      name_en: string;
      name_ar: string;
      archived?: boolean;
      spent: string;
    }>;
  };
  budgets: PaginatedResponse<BudgetRow>;
}
