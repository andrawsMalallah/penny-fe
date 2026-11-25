import React, { useCallback, useEffect, useState } from 'react';
import { CalendarCheck2, Pause, Pencil, Play, Plus, Square } from 'lucide-react';
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
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TransactionModal } from '../activity/TransactionModal';

export function RecurringPage() {
  const { t, language, format, categoryLabel } = useI18n();
  const { settings } = useAuth();

  const [stateFilter, setStateFilter] = useState<'active' | 'paused' | 'stopped' | 'all'>('active');
  const [page, setPage] = useState(1);

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
        recurringApi.list({ state: stateFilter, page }),
        accountsApi.listAllAccounts('false'),
        accountsApi.listAllCategories('false'),
      ]);
      setData(plansRes);
      setAccounts(accs);
      setCategories(cats);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [stateFilter, page]);

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
        const refreshedList = await recurringApi.list({ state: stateFilter, page });
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
      await refreshPendingAndPlans();
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

      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800/80">
        {(['active', 'paused', 'stopped', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStateFilter(s);
              setPage(1);
            }}
            className={`min-h-[36px] px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              stateFilter === s
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {s === 'all' ? t.common.all : t.recurring.states[s]}
          </button>
        ))}
      </div>

      <ErrorAlert error={error} onRetry={() => void loadPlans()} />

      {loading ? (
        <LoadingRows rows={4} />
      ) : !data || data.results.length === 0 ? (
        <EmptyState
          title={t.common.noData}
          action={
            <button
              type="button"
              onClick={() => openPlanModal(null)}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium"
            >
              {t.recurring.newPlan}
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
            {data.results.map((plan) => (
              <div
                key={plan.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="min-w-0 space-y-1">
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

                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0">
                  <CurrencyAmount
                    amount={plan.amount}
                    currency={plan.currency}
                    tone={plan.kind === 'income' ? 'positive' : 'negative'}
                    className="text-base font-semibold"
                  />

                  <div className="flex flex-wrap items-center gap-1.5">
                    {plan.state === 'active' && (
                      <button
                        type="button"
                        onClick={() => openPendingModal(plan)}
                        className="min-h-[38px] px-3 py-1.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium whitespace-nowrap"
                      >
                        <CalendarCheck2 className="w-3.5 h-3.5" />
                        <span>{t.recurring.viewPending}</span>
                      </button>
                    )}
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
              <select
                id="rec-acc"
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {kind === 'expense' && (
              <div>
                <label htmlFor="rec-cat" className="block text-sm font-medium mb-1.5">
                  {t.common.category}
                </label>
                <select
                  id="rec-cat"
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryLabel(c)}
                    </option>
                  ))}
                </select>
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
            {pendingDates.map((d) => (
              <div key={d} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono-num text-sm font-medium">
                  {formatDisplayDate(d, language)}
                </span>
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
