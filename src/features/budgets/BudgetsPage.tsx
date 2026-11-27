import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { accountsApi, budgetsApi } from '../../api/endpoints';
import type { BudgetRow, ExpenseCategory, PaginatedResponse } from '../../api/types';
import { useI18n } from '../../i18n/useI18n';
import { currentMonthYM, formatMonthLabel, shiftMonth } from '../../utils/date';
import { computePercentRatio } from '../../utils/money';
import { PageHeader, EmptyState, LoadingRows } from '../../components/ui/PageHeader';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { Pagination } from '../../components/ui/Pagination';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

interface BudgetsPageProps {
  month?: string;
  onChangeMonth: (month: string) => void;
}

export function BudgetsPage({ month, onChangeMonth }: BudgetsPageProps) {
  const { t, language, dir, categoryLabel } = useI18n();
  const activeMonth = month || currentMonthYM();
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');

  const [data, setData] = useState<PaginatedResponse<BudgetRow> | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [newBudgetOpen, setNewBudgetOpen] = useState(false);
  const [openingBudget, setOpeningBudget] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Edit modal
  const [editingRow, setEditingRow] = useState<BudgetRow | null>(null);
  const [limitIqd, setLimitIqd] = useState('');
  const [limitUsd, setLimitUsd] = useState('');
  const [scope, setScope] = useState<'month' | 'future'>('month');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [deleteRow, setDeleteRow] = useState<BudgetRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await budgetsApi.list(activeMonth, page, categoryFilter);
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [activeMonth, page, categoryFilter]);

  useEffect(() => {
    void loadBudgets();
  }, [loadBudgets]);

  useEffect(() => {
    accountsApi.listCategories({ archived: 'false', page: 1 }).then((response) => {
      const rows = response.results;
      setCategories(rows);
      setCategoryId((current) => current || (rows[0] ? String(rows[0].id) : ''));
    }).catch(setError);
  }, []);

  const openEditModal = (row: BudgetRow) => {
    setEditingRow(row);
    setLimitIqd(row.IQD.limit ?? '');
    setLimitUsd(row.USD.limit ?? '');
    setScope(row.recurring ? 'future' : 'month');
    setSaveError(null);
  };

  const openCategoryBudget = async () => {
    if (!categoryId) return;
    setNewBudgetOpen(false);
    setOpeningBudget(true);
    setError(null);
    try {
      // The list contains only categories with limits; detail also returns unset budgets.
      openEditModal(await budgetsApi.getCategoryBudget(Number(categoryId), activeMonth));
    } catch (err) {
      setError(err);
    } finally {
      setOpeningBudget(false);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    setSaving(true);
    setSaveError(null);
    try {
      await budgetsApi.updateCategoryBudget(editingRow.category_id, {
        month: activeMonth,
        version: editingRow.version,
        scope,
        limit_iqd: limitIqd.trim() || null,
        limit_usd: limitUsd.trim() || null,
      });
      setEditingRow(null);
      await loadBudgets();
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBudget = async () => {
    if (!deleteRow) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await budgetsApi.deleteCategoryBudget(deleteRow.category_id, activeMonth, deleteRow.version);
      setDeleteRow(null);
      if (data?.results.length === 1 && page > 1) setPage(page - 1);
      else await loadBudgets();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.budgets.title}
        subtitle={t.budgets.subtitle}
        actions={
          <button type="button" disabled={categories.length === 0 || openingBudget}
            onClick={() => { setCategoryId((current) => current || String(categories[0].id)); setNewBudgetOpen(true); }}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium disabled:opacity-50">
            <Plus className="w-4 h-4" />
            {t.budgets.newBudget}
          </button>
        }
      />

      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {formatMonthLabel(activeMonth, language)}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="min-w-0">
          <label htmlFor="budget-list-category" className="block text-sm font-medium mb-2">{t.common.category}</label>
          <SearchableSelect id="budget-list-category" label={t.common.category} value={categoryFilter} emptyLabel={t.common.all}
            onChange={(value) => { setCategoryFilter(value); setPage(1); }}
            loadPage={(choicePage) => accountsApi.listCategories({ archived: 'all', page: choicePage })}
            getById={accountsApi.getCategory} getLabel={categoryLabel} getSearchText={(category) => `${category.name_en} ${category.name_ar}`} />
        </div>
        <div className="min-w-0">
          <label htmlFor="budget-month" className="block text-sm font-medium mb-2">{t.budgets.month}</label>
          <div className="flex items-center gap-2">
            <button type="button" aria-label={t.budgets.previousMonth}
              onClick={() => { setPage(1); onChangeMonth(shiftMonth(activeMonth, -1)); }}
              className="min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800">
              <PrevIcon className="w-4 h-4" />
            </button>
            <input id="budget-month" type="month" dir="ltr" value={activeMonth}
              onChange={(event) => { if (event.target.value) { setPage(1); onChangeMonth(event.target.value); } }}
              className="min-h-[44px] min-w-0 flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm" />
            <button type="button" aria-label={t.budgets.nextMonth}
              onClick={() => { setPage(1); onChangeMonth(shiftMonth(activeMonth, 1)); }}
              className="min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800">
              <NextIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ErrorAlert error={error} onRetry={() => void loadBudgets()} />

      {loading ? (
        <LoadingRows rows={4} />
      ) : !data || data.results.length === 0 ? (
        <EmptyState title={t.common.noData} />
      ) : (
        <div className="penny-content-enter space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.results.map((row, index) => (
              <div
                key={row.category_id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs tabular-nums text-slate-500">{(page - 1) * 10 + index + 1}.</span>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {categoryLabel(row)}
                    </h3>
                    {row.recurring && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t.budgets.recurringBadge}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`${t.budgets.editBudget} ${categoryLabel(row)}`}
                      onClick={() => openEditModal(row)}
                      className="min-h-[38px] px-3 py-1.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>{t.common.edit}</span>
                    </button>
                    <button type="button" aria-label={`${t.common.delete} ${categoryLabel(row)}`} onClick={() => { setDeleteError(null); setDeleteRow(row); }} className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  {(['IQD', 'USD'] as const).map((curr) => {
                    const entry = row[curr];
                    const hasLimit = Boolean(entry.limit);
                    const pct = hasLimit
                      ? Math.min(100, computePercentRatio(entry.spent, entry.limit))
                      : 0;
                    return (
                      <div key={curr} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {curr}
                          </span>
                          {hasLimit ? (
                            <span className="text-slate-600 dark:text-slate-400">
                              {t.budgets.spent}:{' '}
                              <CurrencyAmount
                                amount={entry.spent}
                                currency={curr}
                                tone={entry.over ? 'negative' : 'neutral'}
                                className="font-medium"
                              />{' '}
                              / <CurrencyAmount amount={entry.limit} currency={curr} />
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">
                              {t.budgets.noLimitSet} · {t.budgets.spent}:{' '}
                              <CurrencyAmount amount={entry.spent} currency={curr} />
                            </span>
                          )}
                        </div>

                        {hasLimit && (
                          <>
                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  entry.over
                                    ? 'bg-red-600 dark:bg-red-500'
                                    : pct >= 80
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-600 dark:bg-emerald-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span
                                className={
                                  entry.over
                                    ? 'text-red-700 dark:text-red-400 font-medium'
                                    : 'text-slate-500 dark:text-slate-400'
                                }
                              >
                                {entry.over ? t.budgets.exceededBy : t.budgets.remaining}
                              </span>
                              <CurrencyAmount
                                amount={entry.remaining}
                                currency={curr}
                                tone={entry.over ? 'negative' : 'positive'}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
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

      <ConfirmDialog open={Boolean(deleteRow)} onClose={() => setDeleteRow(null)} onConfirm={handleDeleteBudget} title={t.budgets.deleteTitle} body={t.budgets.deleteBody} confirmLabel={t.common.delete} destructive busy={deleteBusy} error={deleteError} />

      <Modal open={newBudgetOpen} onClose={() => setNewBudgetOpen(false)}
        title={t.budgets.setBudget} subtitle={formatMonthLabel(activeMonth, language)}
        footer={
          <>
            <button type="button" onClick={() => setNewBudgetOpen(false)}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium">{t.common.cancel}</button>
            <button type="button" disabled={!categoryId || openingBudget} onClick={() => void openCategoryBudget()}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium disabled:opacity-50">
              {openingBudget ? t.common.loading : t.common.next}
            </button>
          </>
        }>
        <div>
          <label htmlFor="budget-category" className="block text-sm font-medium mb-1.5">{t.budgets.chooseCategory}</label>
          <SearchableSelect id="budget-category" label={t.budgets.chooseCategory} required
            value={categoryId} onChange={setCategoryId}
            loadPage={(choicePage) => accountsApi.listCategories({ archived: 'false', page: choicePage })}
            getById={accountsApi.getCategory} getLabel={categoryLabel}
            getSearchText={(category) => `${category.name_en} ${category.name_ar}`} />
        </div>
      </Modal>

      <Modal
        open={Boolean(editingRow)}
        onClose={saving ? () => {} : () => setEditingRow(null)}
        title={
          editingRow
            ? `${t.budgets.editBudget} · ${categoryLabel(editingRow)}`
            : t.budgets.editBudget
        }
        subtitle={formatMonthLabel(activeMonth, language)}
        footer={
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditingRow(null)}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              form="budget-form"
              disabled={saving}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
            >
              {saving ? t.common.loading : t.common.save}
            </button>
          </>
        }
      >
        <form id="budget-form" onSubmit={handleSaveBudget} className="space-y-4">
          <ErrorAlert
            error={saveError}
            onRefreshConflict={() => {
              setEditingRow(null);
              void loadBudgets();
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="b-iqd" className="block text-sm font-medium mb-1.5">
                {t.budgets.limitIqd}
              </label>
              <input
                id="b-iqd"
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={limitIqd}
                onChange={(e) => setLimitIqd(e.target.value)}
                placeholder="—"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
              />
            </div>

            <div>
              <label htmlFor="b-usd" className="block text-sm font-medium mb-1.5">
                {t.budgets.limitUsd}
              </label>
              <input
                id="b-usd"
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={limitUsd}
                onChange={(e) => setLimitUsd(e.target.value)}
                placeholder="—"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.budgets.clearLimitHint}
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="block text-sm font-medium">{t.budgets.scope}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  { key: 'month', label: t.budgets.scopeMonth },
                  { key: 'future', label: t.budgets.scopeFuture },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setScope(opt.key)}
                  className={`min-h-[42px] px-3 py-2 rounded-lg border text-sm font-medium text-start transition-colors ${
                    scope === opt.key
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.budgets.scopeFutureHint}
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
