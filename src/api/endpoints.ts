import { apiRequest, fetchAllPaginated, generateRequestId } from './client';
import {
  adaptAccountBreakdownPage,
  adaptAnalytics,
  adaptBudgetPage,
  adaptBudgetRow,
  adaptCategoryBreakdownPage,
  adaptDebt,
  adaptDebtPage,
  adaptGroupBreakdownPage,
  adaptMonthlyReview,
  adaptPendingOccurrences,
  adaptPersonBreakdownPage,
  adaptRepayment,
  adaptRepaymentPage,
  type BackendAnalytics,
  type BackendBudgetRow,
  type BackendDebt,
  type BackendMonthlyReview,
} from './adapters';
import type {
  Account,
  AccountGroup,
  AnalyticsPeriod,
  DebtDirection,
  DebtOrigin,
  DebtPerson,
  ExpenseCategory,
  LanguageCode,
  PaginatedResponse,
  RecurringFrequency,
  RecurringPlan,
  RecurringState,
  SessionResponse,
  Transaction,
  TransactionKind,
  TwoFactorSetupPayload,
  TwoFactorStatus,
  UserProfile,
  UserSessionItem,
  UserSettings,
} from './types';
import type { CurrencyCode } from '../utils/money';

export const authApi = {
  getSession: () => apiRequest<SessionResponse>('/api/v1/auth/session/'),
  getMe: () => apiRequest<UserProfile>('/api/v1/auth/me/'),
  register: (payload: {
    display_name: string;
    email: string;
    password: string;
    language: LanguageCode;
    timezone: string;
  }) => apiRequest<{ detail?: string }>('/api/v1/auth/register/', { method: 'POST', body: payload }),
  verifyEmail: async (code: string) =>
    ({ user: await apiRequest<UserProfile>('/api/v1/auth/verify-email/', {
      method: 'POST',
      body: { code },
    }) }),
  resendCode: () => apiRequest<{ detail?: string }>('/api/v1/auth/resend-code/', { method: 'POST' }),
  login: async (payload: { email: string; password: string }): Promise<{ user?: UserProfile; two_factor_required?: boolean }> => {
    const response = await apiRequest<UserProfile | { two_factor_required: true }>('/api/v1/auth/login/', {
      method: 'POST',
      body: payload,
    });
    return 'two_factor_required' in response ? response : { user: response };
  },
  logout: () => apiRequest<void>('/api/v1/auth/logout/', { method: 'POST' }),
  logoutAll: () => apiRequest<void>('/api/v1/auth/logout-all/', { method: 'POST' }),
  listSessions: (page = 1) =>
    apiRequest<PaginatedResponse<UserSessionItem>>('/api/v1/auth/sessions/', {
      query: { page },
    }),

  getTwoFactorStatus: () => apiRequest<TwoFactorStatus>('/api/v1/auth/2fa/'),
  getTwoFactorLoginStatus: () =>
    apiRequest<{ pending: boolean }>('/api/v1/auth/2fa/login/'),
  submitTwoFactorLogin: async (payload: { otp: string; recovery: boolean }) =>
    ({ user: await apiRequest<UserProfile>('/api/v1/auth/2fa/login/', {
      method: 'POST',
      body: payload,
    }) }),
  cancelTwoFactorLogin: () =>
    apiRequest<void>('/api/v1/auth/2fa/login/cancel/', { method: 'POST' }),
  startTwoFactorSetup: (password: string) =>
    apiRequest<TwoFactorSetupPayload>('/api/v1/auth/2fa/setup/', {
      method: 'POST',
      body: { password },
    }),
  cancelTwoFactorSetup: () =>
    apiRequest<void>('/api/v1/auth/2fa/setup/cancel/', { method: 'POST' }),
  enableTwoFactor: (otp: string) =>
    apiRequest<{ recovery_codes: string[] }>('/api/v1/auth/2fa/enable/', {
      method: 'POST',
      body: { otp, recovery: false },
    }),
  disableTwoFactor: (payload: { password: string; otp: string; recovery: boolean }) =>
    apiRequest<void>('/api/v1/auth/2fa/disable/', { method: 'POST', body: payload }),
  regenerateRecoveryCodes: (payload: { password: string; otp: string; recovery: boolean }) =>
    apiRequest<{ recovery_codes: string[] }>('/api/v1/auth/2fa/recovery-codes/', {
      method: 'POST',
      body: payload,
    }),

  requestPasswordReset: (email: string) =>
    apiRequest<void>('/api/v1/auth/password-reset/', { method: 'POST', body: { email } }),
  verifyPasswordResetCode: (code: string) =>
    apiRequest<void>('/api/v1/auth/password-reset/verify/', { method: 'POST', body: { code } }),
  completePasswordReset: (password: string) =>
    apiRequest<void>('/api/v1/auth/password-reset/complete/', {
      method: 'POST',
      body: { password },
    }),
};

export const settingsApi = {
  get: () => apiRequest<UserSettings>('/api/v1/settings/'),
  update: (payload: Partial<UserSettings>) =>
    apiRequest<UserSettings>('/api/v1/settings/', { method: 'POST', body: payload }),
};

export const accountsApi = {
  listGroups: (params?: { archived?: 'false' | 'true' | 'all'; page?: number }) =>
    apiRequest<PaginatedResponse<AccountGroup>>('/api/v1/account-groups/', {
      query: params,
    }),
  listAllGroups: (archived: 'false' | 'true' | 'all' = 'false') =>
    fetchAllPaginated((page) => accountsApi.listGroups({ archived, page })),
  createGroup: (name: string) =>
    apiRequest<AccountGroup>('/api/v1/account-groups/', { method: 'POST', body: { name } }),
  updateGroup: (id: number, name: string) =>
    apiRequest<AccountGroup>(`/api/v1/account-groups/${id}/`, { method: 'POST', body: { name } }),
  archiveGroup: (id: number, archived: boolean) =>
    apiRequest<AccountGroup>(`/api/v1/account-groups/${id}/archive/`, {
      method: 'POST',
      body: { archived },
    }),

  listAccounts: (params?: { archived?: 'false' | 'true' | 'all'; page?: number }) =>
    apiRequest<PaginatedResponse<Account>>('/api/v1/accounts/', { query: params }),
  listAllAccounts: (archived: 'false' | 'true' | 'all' = 'false') =>
    fetchAllPaginated((page) => accountsApi.listAccounts({ archived, page })),
  createAccount: (payload: {
    name: string;
    group: number | null;
    opening_iqd: string;
    opening_usd: string;
    timezone: string;
    target_iqd?: string | null;
    target_usd?: string | null;
  }) => apiRequest<Account>('/api/v1/accounts/', { method: 'POST', body: payload }),
  updateAccount: (
    id: number,
    payload: {
      name: string;
      group: number | null;
      target_iqd?: string | null;
      target_usd?: string | null;
      target_version?: number;
    }
  ) => apiRequest<Account>(`/api/v1/accounts/${id}/`, { method: 'POST', body: payload }),
  archiveAccount: (id: number, archived: boolean) =>
    apiRequest<Account>(`/api/v1/accounts/${id}/archive/`, {
      method: 'POST',
      body: { archived },
    }),

  initializeCategories: () =>
    apiRequest<void>(
      '/api/v1/expense-categories/initialize/',
      { method: 'POST' }
    ),
  listCategories: (params?: { archived?: 'false' | 'true' | 'all'; page?: number }) =>
    apiRequest<PaginatedResponse<ExpenseCategory>>('/api/v1/expense-categories/', {
      query: params,
    }),
  listAllCategories: (archived: 'false' | 'true' | 'all' = 'false') =>
    fetchAllPaginated((page) => accountsApi.listCategories({ archived, page })),
  createCategory: (payload: { name_en: string; name_ar: string }) =>
    apiRequest<ExpenseCategory>('/api/v1/expense-categories/', {
      method: 'POST',
      body: payload,
    }),
  updateCategory: (id: number, payload: { name_en: string; name_ar: string }) =>
    apiRequest<ExpenseCategory>(`/api/v1/expense-categories/${id}/`, {
      method: 'POST',
      body: payload,
    }),
  archiveCategory: (id: number, archived: boolean) =>
    apiRequest<ExpenseCategory>(`/api/v1/expense-categories/${id}/archive/`, {
      method: 'POST',
      body: { archived },
    }),

  listDebtPeople: (params?: { page?: number; archived?: 'false' | 'true' | 'all' }) =>
    apiRequest<PaginatedResponse<DebtPerson>>('/api/v1/debt-people/', { query: params }),
  listAllDebtPeople: (archived: 'false' | 'true' | 'all' = 'false') =>
    fetchAllPaginated((page) => accountsApi.listDebtPeople({ page, archived })),
};

export interface TransactionInputPayload {
  account: number;
  destination: number | null;
  category: number | null;
  kind: Exclude<TransactionKind, 'debt_in' | 'debt_out'>;
  currency: CurrencyCode;
  amount: string;
  exchange_rate: string | null;
  received_amount: string | null;
  date: string;
  note: string;
  timezone: string;
}

export interface TransactionFilterQuery {
  account?: string | number;
  category?: string | number;
  kind?: string;
  currency?: '' | CurrencyCode;
  start?: string;
  end?: string;
  page?: number;
}

export const transactionsApi = {
  list: (query?: TransactionFilterQuery) =>
    apiRequest<PaginatedResponse<Transaction>>('/api/v1/transactions/', { query }),
  create: async (payload: TransactionInputPayload) => {
    const request_id = await generateRequestId();
    return apiRequest<Transaction>('/api/v1/transactions/', {
      method: 'POST',
      body: { ...payload, request_id },
    });
  },
  update: (id: number, payload: TransactionInputPayload & { version: number }) =>
    apiRequest<Transaction>(`/api/v1/transactions/${id}/`, {
      method: 'POST',
      body: payload,
    }),
  delete: (id: number, version: number) =>
    apiRequest<void>(`/api/v1/transactions/${id}/delete/`, {
      method: 'POST',
      body: { version },
    }),
  getExportCount: (query?: TransactionFilterQuery) =>
    apiRequest<{ count: number }>('/api/v1/transactions/export/count/', {
      query: {
        account: query?.account,
        category: query?.category,
        kind: query?.kind,
        currency: query?.currency,
        start: query?.start,
        end: query?.end,
      },
    }),
  buildExportUrl: (
    query: TransactionFilterQuery,
    language: LanguageCode,
    expectedCount: number
  ) => {
    const params = new URLSearchParams();
    if (query.account) params.set('account', String(query.account));
    if (query.category) params.set('category', String(query.category));
    if (query.kind) params.set('kind', query.kind);
    if (query.currency) params.set('currency', query.currency);
    if (query.start) params.set('start', query.start);
    if (query.end) params.set('end', query.end);
    params.set('language', language);
    params.set('expected_count', String(expectedCount));
    return `/api/v1/transactions/export/?${params.toString()}`;
  },
};

export interface DebtInputPayload {
  person?: number;
  person_name?: string;
  direction: DebtDirection;
  origin: DebtOrigin;
  account: number | null;
  currency: CurrencyCode;
  amount: string;
  date: string;
  note: string;
  timezone: string;
}

export interface RepaymentInputPayload {
  account: number;
  amount: string;
  date: string;
  note: string;
  timezone: string;
}

export const debtsApi = {
  list: (query?: {
    person?: string | number;
    direction?: '' | DebtDirection;
    currency?: '' | CurrencyCode;
    status?: 'open' | 'settled' | 'all';
    page?: number;
  }) => apiRequest<PaginatedResponse<BackendDebt>>('/api/v1/debts/', { query }).then(adaptDebtPage),
  get: (id: number) => apiRequest<BackendDebt>(`/api/v1/debts/${id}/`).then(adaptDebt),
  create: async (payload: DebtInputPayload) => {
    const request_id = await generateRequestId();
    return apiRequest<BackendDebt>('/api/v1/debts/', {
      method: 'POST',
      body: { ...payload, request_id },
    }).then(adaptDebt);
  },
  update: (id: number, payload: Partial<DebtInputPayload> & { version: number }) =>
    apiRequest<BackendDebt>(`/api/v1/debts/${id}/`, { method: 'POST', body: payload }).then(adaptDebt),
  delete: (id: number, version: number) =>
    apiRequest<void>(`/api/v1/debts/${id}/delete/`, {
      method: 'POST',
      body: { version },
    }),

  listRepayments: (debtId: number, page = 1) =>
    apiRequest<PaginatedResponse<Transaction>>(`/api/v1/debts/${debtId}/repayments/`, {
      query: { page },
    }).then(adaptRepaymentPage),
  createRepayment: async (debtId: number, payload: RepaymentInputPayload) => {
    const request_id = await generateRequestId();
    return apiRequest<Transaction>(`/api/v1/debts/${debtId}/repayments/`, {
      method: 'POST',
      body: { ...payload, request_id },
    }).then(adaptRepayment);
  },
  updateRepayment: (
    debtId: number,
    entryId: number,
    payload: RepaymentInputPayload & { version: number }
  ) =>
    apiRequest<Transaction>(`/api/v1/debts/${debtId}/repayments/${entryId}/`, {
      method: 'POST',
      body: payload,
    }).then(adaptRepayment),
  deleteRepayment: (debtId: number, entryId: number, version: number) =>
    apiRequest<void>(`/api/v1/debts/${debtId}/repayments/${entryId}/delete/`, {
      method: 'POST',
      body: { version },
    }),
};

export const budgetsApi = {
  list: (month: string, page = 1) =>
    apiRequest<PaginatedResponse<BackendBudgetRow>>('/api/v1/budgets/', {
      query: { month, page },
    }).then(adaptBudgetPage),
  getCategoryBudget: (categoryId: number, month: string) =>
    apiRequest<BackendBudgetRow>(`/api/v1/budgets/${categoryId}/`, { query: { month } }).then(adaptBudgetRow),
  updateCategoryBudget: (
    categoryId: number,
    payload: {
      month: string;
      version: number;
      scope: 'month' | 'future';
      limit_iqd: string | null;
      limit_usd: string | null;
    }
  ) =>
    apiRequest<BackendBudgetRow>(`/api/v1/budgets/${categoryId}/`, {
      method: 'POST',
      body: payload,
    }).then(adaptBudgetRow),
};

export interface RecurringInputPayload {
  name: string;
  kind: 'income' | 'expense';
  account: number;
  category: number | null;
  currency: CurrencyCode;
  amount: string;
  note: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  timezone: string;
}

export const recurringApi = {
  list: (params?: { state?: 'active' | 'paused' | 'stopped' | 'all'; page?: number }) =>
    apiRequest<PaginatedResponse<RecurringPlan>>('/api/v1/recurring/', { query: params }),
  create: async (payload: RecurringInputPayload) => {
    const request_id = await generateRequestId();
    return apiRequest<RecurringPlan>('/api/v1/recurring/', {
      method: 'POST',
      body: { ...payload, request_id },
    });
  },
  update: (id: number, payload: RecurringInputPayload & { version: number }) =>
    apiRequest<RecurringPlan>(`/api/v1/recurring/${id}/`, {
      method: 'POST',
      body: payload,
    }),
  changeState: (id: number, payload: { version: number; state: RecurringState; timezone: string }) =>
    apiRequest<RecurringPlan>(`/api/v1/recurring/${id}/state/`, {
      method: 'POST',
      body: payload,
    }),
  listPending: (id: number, params: { timezone: string; after?: string }) =>
    apiRequest<{ results: string[]; next_cursor: string | null }>(`/api/v1/recurring/${id}/pending/`, {
      query: params,
    }).then(adaptPendingOccurrences),
  confirmOccurrence: (
    id: number,
    payload: {
      version: number;
      scheduled_date: string;
      timezone: string;
      transaction: TransactionInputPayload;
    }
  ) =>
    apiRequest<{ scheduled_date: string; skipped: boolean; transaction: number | null }>(
      `/api/v1/recurring/${id}/confirm/`,
      { method: 'POST', body: payload }
    ),
  skipOccurrence: (
    id: number,
    payload: { version: number; scheduled_date: string; timezone: string }
  ) =>
    apiRequest<{ scheduled_date: string; skipped: boolean; transaction: number | null }>(`/api/v1/recurring/${id}/skip/`, {
      method: 'POST',
      body: payload,
    }),
};

export const analyticsApi = {
  getSummary: (params: {
    period: AnalyticsPeriod;
    timezone: string;
    start?: string;
    end?: string;
  }) => apiRequest<BackendAnalytics>('/api/v1/analytics/', { query: params }).then(adaptAnalytics),
  getAccounts: (params: {
    period: AnalyticsPeriod;
    timezone: string;
    start?: string;
    end?: string;
    page?: number;
  }) =>
    apiRequest<Parameters<typeof adaptAccountBreakdownPage>[0]>('/api/v1/analytics/accounts/', {
      query: params,
    }).then(adaptAccountBreakdownPage),
  getGroups: (params: {
    period: AnalyticsPeriod;
    timezone: string;
    start?: string;
    end?: string;
    page?: number;
  }) =>
    apiRequest<Parameters<typeof adaptGroupBreakdownPage>[0]>('/api/v1/analytics/groups/', {
      query: params,
    }).then(adaptGroupBreakdownPage),
  getCategories: (params: {
    period: AnalyticsPeriod;
    timezone: string;
    start?: string;
    end?: string;
    page?: number;
  }) =>
    apiRequest<Parameters<typeof adaptCategoryBreakdownPage>[0]>('/api/v1/analytics/categories/', {
      query: params,
    }).then(adaptCategoryBreakdownPage),
  getPeople: (params: {
    period: AnalyticsPeriod;
    timezone: string;
    start?: string;
    end?: string;
    page?: number;
  }) =>
    apiRequest<Parameters<typeof adaptPersonBreakdownPage>[0]>('/api/v1/analytics/people/', {
      query: params,
    }).then(adaptPersonBreakdownPage),
  getMonthlyReview: (params: { month: string; timezone: string; page?: number }) =>
    apiRequest<BackendMonthlyReview>('/api/v1/analytics/monthly/', { query: params }).then(adaptMonthlyReview),
};
