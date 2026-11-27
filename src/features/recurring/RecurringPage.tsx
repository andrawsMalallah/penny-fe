import React, { useCallback, useEffect, useState } from 'react';
import { CalendarCheck2, Pause, Pencil, Play, Plus, Square, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/client';
import { accountsApi, recurringApi } from '../../api/endpoints';
import type {
  Account,
  ExpenseCategory,
  PaginatedResponse,
  RecurringFrequency,
  RecurringPlan,
  RecurringState,
} from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/useI18n';
import { formatDisplayDate, getDeviceTimezone, todayYMD } from '../../utils/date';
import type { CurrencyCode } from '../../utils/money';
import { PageHeader, EmptyState, LoadingRows } from '../../components/ui/PageHeader';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { Pagination } from '../../components/ui/Pagination';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TransactionModal } from '../activity/TransactionModal';

export function RecurringPage() {
  const { t, language, format, categoryLabel } = useI18n();
  const { settings } = useAuth();

  const [stateFilter, setStateFilter] = useState<'active' | 'paused' | 'stopped' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [frequencyFilter, setFrequencyFilter] = useState<'' | RecurringFrequency>('');
  const [accountFilter, setAccountFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [kindFilter, setKindFilter] = useState<'' | 'income' | 'expense'>('');
  const [currencyFilter, setCurrencyFilter] = useState<'' | CurrencyCode>('');

  const [data, setData] = useState<PaginatedResponse<RecurringPlan> | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Plan Create / Edit Modal
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RecurringPlan | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'income' | 'expense'>('expense');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('IQD');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(() => todayYMD());
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);

  // Pending Occurrences Modal
  const [pendingPlan, setPendingPlan] = useState<RecurringPlan | null>(null);
  const [pendingDates, setPendingDates] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<unknown>(null);

  // Confirm occurrence via TransactionModal
  const [confirmingDate, setConfirmingDate] = useState<string | null>(null);

  // Skip / Stop confirmation
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    destructive?: boolean;
    action: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, accs, cats] = await Promise.all([
        recurringApi.list({ state: stateFilter, page, frequency: frequencyFilter || undefined,
          account: accountFilter || undefined, category: categoryFilter || undefined,
          kind: kindFilter || undefined, currency: currencyFilter || undefined }),
        accountsApi.listAccounts({ archived: 'false', page: 1 }).then((response) => response.results),
        accountsApi.listCategories({ archived: 'false', page: 1 }).then((response) => response.results),
      ]);
      setData(plansRes);
      setAccounts(accs);
      setCategories(cats);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [stateFilter, page, frequencyFilter, accountFilter, categoryFilter, kindFilter, currencyFilter]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const openPlanModal = (plan: RecurringPlan | null) => {
    setEditingPlan(plan);
    setSaveError(null);
    if (plan) {
      setName(plan.name);
      setKind(plan.kind);
      setAccountId(String(plan.account));
      setCategoryId(plan.category ? String(plan.category) : '');
      setCurrency(plan.currency);
      setAmount(plan.amount);
      setFrequency(plan.frequency);
      setStartDate(plan.start_date);
      setEndDate(plan.end_date ?? '');
      setNote(plan.note ?? '');
    } else {
      setName('');
      setKind('expense');
      setAccountId(
        settings?.default_account
          ? String(settings.default_account)
          : accounts.length > 0
            ? String(accounts[0].id)
            : ''
      );
      setCategoryId(categories.length > 0 ? String(categories[0].id) : '');
      setCurrency(settings?.default_currency === 'USD' ? 'USD' : 'IQD');
      setAmount('');
      setFrequency('monthly');
      setStartDate(todayYMD());
      setEndDate('');
      setNote('');
    }
    setPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        kind,
        account: Number(accountId),
        category: kind === 'expense' && categoryId ? Number(categoryId) : null,
        currency,
        amount: amount.trim(),
        note: note.trim(),
        frequency,
        start_date: startDate,
        end_date: endDate.trim() || null,
        timezone: getDeviceTimezone(),
      };
      if (editingPlan) {
        await recurringApi.update(editingPlan.id, {
          ...payload,
          version: editingPlan.version,
        });
      } else {
        await recurringApi.create(payload);
      }
      setPlanModalOpen(false);
      await loadPlans();
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeState = async (plan: RecurringPlan, nextState: RecurringState) => {
    try {
      await recurringApi.changeState(plan.id, {
        version: plan.version,
        state: nextState,
        timezone: getDeviceTimezone(),
      });
      await loadPlans();
    } catch (err) {
      setError(err);
    }
  };

  const loadPendingDates = async (plan: RecurringPlan, after?: string) => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const res = await recurringApi.listPending(plan.id, {
        timezone: getDeviceTimezone(),
        after,
      });
      if (after) {
        setPendingDates((prev) => [...prev, ...res.dates]);
      } else {
        setPendingDates(res.dates);
      }
      setNextCursor(res.next_cursor);
    } catch (err) {
      setPendingError(err);
    } finally {
      setPendingLoading(false);
    }
  };

  const openPendingModal = (plan: RecurringPlan) => {
    setPendingPlan(plan);
    setPendingDates([]);
    setNextCursor(null);
    void loadPendingDates(plan);
  };

  const refreshPendingAndPlans = async () => {
    await loadPlans();
    if (pendingPlan) {
      try {
        const refreshedList = await recurringApi.list({ state: stateFilter, page, frequency: frequencyFilter || undefined,
          account: accountFilter || undefined, category: categoryFilter || undefined,
          kind: kindFilter || undefined, currency: currencyFilter || undefined });
        const updated = refreshedList.results.find((p) => p.id === pendingPlan.id) || pendingPlan;
        setPendingPlan(updated);
        await loadPendingDates(updated);
      } catch {
        // Ignore refresh error
      }
    }
  };

  const runConfirmedDialog = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      await confirmDialog.action();
      setConfirmDialog(null);
      if (data?.results.length === 1 && page > 1) setPage(page - 1);
      else await refreshPendingAndPlans();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirmBusy(false);
    }
  };

  const fieldErrors = saveError instanceof ApiError ? saveError.fieldErrors : {};

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.recurring.title}
        subtitle={t.recurring.subtitle}
        actions={
          <button
            type="button"
            onClick={() => openPlanModal(null)}
            className="min-h-[40px] px-4 py-2 inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.recurring.newPlan}</span>
          </button>
        }
      />

      <p className="text-xs text-slate-600 dark:text-slate-400">
        {t.recurring.manualPostingNotice}
      </p>

      <div className="penny-page-tabs bg-slate-200/70 dark:bg-slate-800/80">
        {(['active', 'paused', 'stopped', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStateFilter(s);
              setPage(1);
            }}
            className={`min-h-[36px] px-1.5 sm:px-2 lg:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors leading-tight ${
              stateFilter === s
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {s === 'all' ? t.common.all : t.recurring.states[s]}
          </button>
        ))}
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div>
          <label htmlFor="recurring-frequency-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t.recurring.frequency}</label>
          <select id="recurring-frequency-filter" value={frequencyFilter}
            onChange={(event) => { setFrequencyFilter(event.target.value as '' | RecurringFrequency); setPage(1); }}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm">
            <option value="">{t.common.all}</option>
            <option value="weekly">{t.recurring.weekly}</option>
            <option value="monthly">{t.recurring.monthly}</option>
            <option value="yearly">{t.recurring.yearly}</option>
          </select>
        </div>
        <div>
          <label htmlFor="recurring-account-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t.common.account}</label>
          <SearchableSelect id="recurring-account-filter" label={t.common.account} value={accountFilter} emptyLabel={t.common.all}
            onChange={(value) => { setAccountFilter(value); setPage(1); }}
            loadPage={(choicePage) => accountsApi.listAccounts({ archived: 'all', page: choicePage })}
            getById={accountsApi.getAccount} getLabel={(account) => account.name} />
        </div>
        <div>
          <label htmlFor="recurring-category-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t.common.category}</label>
          <SearchableSelect id="recurring-category-filter" label={t.common.category} value={categoryFilter} emptyLabel={t.common.all}
            onChange={(value) => { setCategoryFilter(value); setPage(1); }}
            loadPage={(choicePage) => accountsApi.listCategories({ archived: 'all', page: choicePage })}
            getById={accountsApi.getCategory} getLabel={categoryLabel} getSearchText={(category) => `${category.name_en} ${category.name_ar}`} />
        </div>
        <div>
          <label htmlFor="recurring-kind" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t.activity.kind}</label>
          <select id="recurring-kind" value={kindFilter} onChange={(event) => { setKindFilter(event.target.value as typeof kindFilter); setPage(1); }}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm">
            <option value="">{t.common.all}</option><option value="expense">{t.activity.kinds.expense}</option><option value="income">{t.activity.kinds.income}</option>
          </select>
        </div>
        <div>
          <label htmlFor="recurring-currency" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t.common.currency}</label>
          <select id="recurring-currency" value={currencyFilter} onChange={(event) => { setCurrencyFilter(event.target.value as typeof currencyFilter); setPage(1); }}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm">
            <option value="">{t.common.all}</option><option value="IQD">IQD</option><option value="USD">USD</option>
          </select>
        </div>
        {(frequencyFilter || accountFilter || categoryFilter || kindFilter || currencyFilter) && (
          <button type="button" onClick={() => { setFrequencyFilter(''); setAccountFilter(''); setCategoryFilter(''); setKindFilter(''); setCurrencyFilter(''); setPage(1); }}
            className="min-h-[40px] px-3 text-sm font-medium text-emerald-700 dark:text-emerald-400 text-start hover:underline sm:col-span-2 xl:col-span-5">
            {t.common.resetFilters}
          </button>
        )}
      </section>

      <ErrorAlert error={error} onRetry={() => void loadPlans()} />

      {loading ? (
        <LoadingRows rows={4} />
      ) : !data || data.results.length === 0 ? (
        <EmptyState title={t.common.noData} />
      ) : (
        <div className="penny-content-enter space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
            {data.results.map((plan, index) => (
              <div
                key={plan.id}
                className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center gap-x-4 gap-y-3"
              >
                <div className="min-w-0 space-y-1">
                  <span className="text-xs tabular-nums text-slate-500">{(page - 1) * 10 + index + 1}.</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {plan.name}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      · {t.activity.kinds[plan.kind]} · {t.recurring[plan.frequency]} ·{' '}
                      {t.recurring.states[plan.state]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {plan.account_name}
                    {plan.category
                      ? ` · ${categoryLabel({
                          name_en: plan.category_name_en,
                          name_ar: plan.category_name_ar,
                          name: plan.category_name,
                        })}`
                      : ''}
                    {' · '}
                    {formatDisplayDate(plan.start_date, language)}
                    {plan.end_date ? ` → ${formatDisplayDate(plan.end_date, language)}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 lg:col-start-2 lg:row-start-1">
                  <CurrencyAmount
                    amount={plan.amount}
                    currency={plan.currency}
                    tone={plan.kind === 'income' ? 'positive' : 'negative'}
                    className="text-base font-semibold"
                  />

                  <div className="flex flex-wrap items-center gap-1.5">
                    {plan.state !== 'stopped' && (
                      <button
                        type="button"
                        onClick={() => openPlanModal(plan)}
                        aria-label={`${t.common.edit} ${plan.name}`}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {plan.state === 'stopped' && <button type="button" aria-label={`${t.common.delete} ${plan.name}`} onClick={() => {
                      setConfirmError(null);
                      setConfirmDialog({
                        title: t.recurring.deleteStoppedTitle,
                        body: t.recurring.deleteStoppedBody,
                        confirmLabel: t.common.delete,
                        destructive: true,
                        action: () => recurringApi.deleteStopped(plan.id, plan.version),
                      });
                    }} className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 className="w-3.5 h-3.5" /></button>}
                    {plan.state === 'active' && (
                      <button
                        type="button"
                        onClick={() => void handleChangeState(plan, 'paused')}
                        className="min-h-[38px] px-3 py-1.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>{t.recurring.pause}</span>
                      </button>
                    )}
                    {plan.state === 'paused' && (
                      <button
                        type="button"
                        onClick={() => void handleChangeState(plan, 'active')}
                        className="min-h-[38px] px-3 py-1.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{t.recurring.resume}</span>
                      </button>
                    )}
                    {plan.state !== 'stopped' && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmError(null);
                          setConfirmDialog({
                            title: t.recurring.stopConfirmTitle,
                            body: t.recurring.stopConfirmBody,
                            confirmLabel: t.recurring.stop,
                            destructive: true,
                            action: async () => {
                              await recurringApi.changeState(plan.id, {
                                version: plan.version,
                                state: 'stopped',
                                timezone: getDeviceTimezone(),
                              });
                            },
                          });
                        }}
                        className="min-h-[38px] px-3 py-1.5 inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>{t.recurring.stop}</span>
                      </button>
                    )}
                  </div>
                </div>
                {plan.state === 'active' && (
                  <button
                    type="button"
                    onClick={() => openPendingModal(plan)}
                    className="w-full sm:w-fit min-h-[40px] sm:min-h-0 px-3 sm:px-0 py-2 sm:py-0 inline-flex items-center justify-center sm:justify-start gap-1.5 rounded-lg sm:rounded-none bg-emerald-700 sm:bg-transparent text-white sm:text-emerald-700 dark:sm:text-emerald-400 hover:bg-emerald-800 sm:hover:bg-transparent sm:hover:underline text-xs font-medium lg:col-start-1 lg:row-start-2"
                  >
                    <CalendarCheck2 className="w-3.5 h-3.5" />
                    <span>{t.recurring.viewPending}</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            count={data.count}
            hasNext={Boolean(data.next)}
            hasPrevious={Boolean(data.previous)}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      <Modal
        open={planModalOpen}
        onClose={saving ? () => {} : () => setPlanModalOpen(false)}
        title={editingPlan ? t.recurring.editPlan : t.recurring.newPlan}
        size="lg"
        footer={
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => setPlanModalOpen(false)}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              form="recurring-form"
              disabled={saving}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
            >
              {saving ? t.common.loading : t.common.save}
            </button>
          </>
        }
      >
        <form id="recurring-form" onSubmit={handleSavePlan} className="space-y-4">
          <ErrorAlert
            error={saveError}
            onRefreshConflict={() => {
              setPlanModalOpen(false);
              void loadPlans();
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rec-name" className="block text-sm font-medium mb-1.5">
                {t.recurring.planName}
              </label>
              <input
                id="rec-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.name[0]}
                </p>
              )}
            </div>

            <div>
              <span className="block text-sm font-medium mb-1.5">{t.activity.kind}</span>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                {(['expense', 'income'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`min-h-[36px] rounded-md text-xs font-medium ${
                      kind === k
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t.activity.kinds[k]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rec-acc" className="block text-sm font-medium mb-1.5">
                {t.common.account}
              </label>
              <SearchableSelect
                id="rec-acc"
                label={t.common.account}
                required
                value={accountId}
                onChange={setAccountId}
                loadPage={(page) => accountsApi.listAccounts({ archived: 'false', page })}
                getById={accountsApi.getAccount}
                getLabel={(account) => account.name}
              />
            </div>

            {kind === 'expense' && (
              <div>
                <label htmlFor="rec-cat" className="block text-sm font-medium mb-1.5">
                  {t.common.category}
                </label>
                <SearchableSelect
                  id="rec-cat"
                  label={t.common.category}
                  required
                  value={categoryId}
                  onChange={setCategoryId}
                  loadPage={(page) => accountsApi.listCategories({ archived: 'false', page })}
                  getById={accountsApi.getCategory}
                  getLabel={categoryLabel} getSearchText={(category) => `${category.name_en} ${category.name_ar}`}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="block text-sm font-medium mb-1.5">{t.common.currency}</span>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                {(['IQD', 'USD'] as CurrencyCode[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`min-h-[36px] rounded-md text-xs font-semibold ${
                      currency === c
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="rec-amt" className="block text-sm font-medium mb-1.5">
                {t.common.amount}
              </label>
              <input
                id="rec-amt"
                type="text"
                inputMode="decimal"
                required
                dir="ltr"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
              />
            </div>

            <div>
              <label htmlFor="rec-freq" className="block text-sm font-medium mb-1.5">
                {t.recurring.frequency}
              </label>
              <select
                id="rec-freq"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="weekly">{t.recurring.weekly}</option>
                <option value="monthly">{t.recurring.monthly}</option>
                <option value="yearly">{t.recurring.yearly}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rec-start" className="block text-sm font-medium mb-1.5">
                {t.recurring.startDate}
              </label>
              <input
                id="rec-start"
                type="date"
                required
                dir="ltr"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
              />
            </div>

            <div>
              <label htmlFor="rec-end" className="block text-sm font-medium mb-1.5">
                {t.recurring.endDate}{' '}
                <span className="text-xs text-slate-500">({t.common.optional})</span>
              </label>
              <input
                id="rec-end"
                type="date"
                dir="ltr"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="rec-note" className="block text-sm font-medium mb-1.5">
              {t.common.note} <span className="text-xs text-slate-500">({t.common.optional})</span>
            </label>
            <input
              id="rec-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </form>
      </Modal>

      {/* Pending Occurrences Modal */}
      <Modal
        open={Boolean(pendingPlan)}
        onClose={() => setPendingPlan(null)}
        title={pendingPlan ? `${t.recurring.pendingOccurrences} · ${pendingPlan.name}` : ''}
        size="md"
        footer={
          <button
            type="button"
            onClick={() => setPendingPlan(null)}
            className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
          >
            {t.common.close}
          </button>
        }
      >
        <ErrorAlert error={pendingError} />

        {pendingLoading && pendingDates.length === 0 ? (
          <p className="text-sm text-slate-500">{t.common.loading}</p>
        ) : pendingDates.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400 py-4">
            {t.recurring.noPending}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {pendingDates.map((d, index) => (
              <div key={d} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono-num text-sm font-medium"><span className="me-2 text-xs text-slate-500">{index + 1}.</span>{formatDisplayDate(d, language)}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDate(d)}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium whitespace-nowrap"
                  >
                    {t.recurring.confirmOccurrence}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!pendingPlan) return;
                      setConfirmError(null);
                      setConfirmDialog({
                        title: t.recurring.skipConfirmTitle,
                        body: format(t.recurring.skipConfirmBody, {
                          date: formatDisplayDate(d, language),
                        }),
                        confirmLabel: t.recurring.skipOccurrence,
                        action: async () => {
                          await recurringApi.skipOccurrence(pendingPlan.id, {
                            version: pendingPlan.version,
                            scheduled_date: d,
                            timezone: getDeviceTimezone(),
                          });
                        },
                      });
                    }}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    {t.recurring.skipOccurrence}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {nextCursor && pendingPlan && (
          <div className="pt-2">
            <button
              type="button"
              disabled={pendingLoading}
              onClick={() => void loadPendingDates(pendingPlan, nextCursor)}
              className="w-full min-h-[40px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {pendingLoading ? t.common.loading : t.recurring.loadMoreDates}
            </button>
          </div>
        )}
      </Modal>

      {/* Confirm Recurring Occurrence via reviewed TransactionModal */}
      {pendingPlan && confirmingDate && (
        <TransactionModal
          open={Boolean(confirmingDate)}
          onClose={() => setConfirmingDate(null)}
          prefill={{
            kind: pendingPlan.kind,
            account: pendingPlan.account,
            category: pendingPlan.category,
            currency: pendingPlan.currency,
            amount: pendingPlan.amount,
            date: confirmingDate,
            note: pendingPlan.note,
          }}
          customTitle={t.recurring.confirmOccurrenceTitle}
          customSubtitle={format(t.recurring.confirmOccurrenceSubtitle, {
            date: formatDisplayDate(confirmingDate, language),
          })}
          customSubmit={async (txPayload) => {
            await recurringApi.confirmOccurrence(pendingPlan.id, {
              version: pendingPlan.version,
              scheduled_date: confirmingDate,
              timezone: getDeviceTimezone(),
              transaction: txPayload,
            });
          }}
          onSaved={refreshPendingAndPlans}
          onRefreshConflict={refreshPendingAndPlans}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        onClose={() => setConfirmDialog(null)}
        onConfirm={runConfirmedDialog}
        title={confirmDialog?.title ?? ''}
        body={confirmDialog?.body ?? ''}
        confirmLabel={confirmDialog?.confirmLabel}
        destructive={confirmDialog?.destructive}
        busy={confirmBusy}
        error={confirmError}
      />
    </div>
  );
}
