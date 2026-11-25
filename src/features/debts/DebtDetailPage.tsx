import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { accountsApi, debtsApi } from '../../api/endpoints';
import type { Account, Debt, PaginatedResponse, Repayment } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/useI18n';
import { formatDisplayDate, getDeviceTimezone, todayYMD } from '../../utils/date';
import { formatMoney } from '../../utils/money';
import { PageHeader, EmptyState, LoadingRows } from '../../components/ui/PageHeader';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

interface DebtDetailPageProps {
  debtId: number;
  onBack: () => void;
}

export function DebtDetailPage({ debtId, onBack }: DebtDetailPageProps) {
  const { t, language, dir } = useI18n();
  const { settings } = useAuth();

  const [debt, setDebt] = useState<Debt | null>(null);
  const [repaymentsRes, setRepaymentsRes] = useState<PaginatedResponse<Repayment> | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Edit Debt modal
  const [editOpen, setEditOpen] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAccount, setEditAccount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<unknown>(null);

  // Delete Debt confirm
  const [deleteDebtOpen, setDeleteDebtOpen] = useState(false);
  const [deletingDebt, setDeletingDebt] = useState(false);
  const [deleteDebtError, setDeleteDebtError] = useState<string | null>(null);

  // Repayment modal
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Repayment | null>(null);
  const [repAccount, setRepAccount] = useState('');
  const [repAmount, setRepAmount] = useState('');
  const [repDate, setRepDate] = useState(() => todayYMD());
  const [repNote, setRepNote] = useState('');
  const [repBusy, setRepBusy] = useState(false);
  const [repError, setRepError] = useState<unknown>(null);

  // Delete Repayment confirm
  const [deleteRepTarget, setDeleteRepTarget] = useState<Repayment | null>(null);
  const [deletingRep, setDeletingRep] = useState(false);
  const [deleteRepError, setDeleteRepError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [debtData, repsData, accs] = await Promise.all([
        debtsApi.get(debtId),
        debtsApi.listRepayments(debtId, page),
        accountsApi.listAllAccounts('false'),
      ]);
      setDebt(debtData);
      setRepaymentsRes(repsData);
      setAccounts(accs);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [debtId, page]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const openEditDebt = () => {
    if (!debt) return;
    setEditError(null);
    setEditAmount(debt.amount);
    setEditDate(debt.date);
    setEditAccount(debt.account ? String(debt.account) : '');
    setEditNote(debt.note ?? '');
    setEditOpen(true);
  };

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debt) return;
    setEditError(null);
    setEditBusy(true);
    try {
      await debtsApi.update(debt.id, {
        person: debt.person,
        direction: debt.direction,
        origin: debt.origin,
        account: debt.origin === 'movement' && editAccount ? Number(editAccount) : null,
        currency: debt.currency,
        amount: editAmount.trim(),
        date: editDate,
        note: editNote.trim(),
        timezone: getDeviceTimezone(),
        version: debt.version,
      });
      setEditOpen(false);
      await loadDetail();
    } catch (err) {
      setEditError(err);
    } finally {
      setEditBusy(false);
    }
  };

  const handleDeleteDebt = async () => {
    if (!debt) return;
    setDeletingDebt(true);
    setDeleteDebtError(null);
    try {
      await debtsApi.delete(debt.id, debt.version);
      setDeleteDebtOpen(false);
      onBack();
    } catch (err) {
      setDeleteDebtError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingDebt(false);
    }
  };

  const openRepaymentModal = (rep: Repayment | null) => {
    setEditingRep(rep);
    setRepError(null);
    if (rep) {
      setRepAccount(String(rep.account));
      setRepAmount(rep.amount);
      setRepDate(rep.date);
      setRepNote(rep.note ?? '');
    } else {
      const defAcc =
        debt?.account ??
        settings?.default_account ??
        (accounts.length > 0 ? accounts[0].id : undefined);
      setRepAccount(defAcc ? String(defAcc) : '');
      setRepAmount(debt?.remaining ?? '');
      setRepDate(todayYMD());
      setRepNote('');
    }
    setRepModalOpen(true);
  };

  const handleSaveRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debt) return;
    setRepError(null);
    setRepBusy(true);
    try {
      const payload = {
        account: Number(repAccount),
        amount: repAmount.trim(),
        date: repDate,
        note: repNote.trim(),
        timezone: getDeviceTimezone(),
      };
      if (editingRep) {
        await debtsApi.updateRepayment(debt.id, editingRep.id, {
          ...payload,
          version: editingRep.version,
        });
      } else {
        await debtsApi.createRepayment(debt.id, payload);
      }
      setRepModalOpen(false);
      await loadDetail();
    } catch (err) {
      setRepError(err);
    } finally {
      setRepBusy(false);
    }
  };

  const handleDeleteRepayment = async () => {
    if (!debt || !deleteRepTarget) return;
    setDeletingRep(true);
    setDeleteRepError(null);
    try {
      await debtsApi.deleteRepayment(debt.id, deleteRepTarget.id, deleteRepTarget.version);
      setDeleteRepTarget(null);
      await loadDetail();
    } catch (err) {
      setDeleteRepError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingRep(false);
    }
  };

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="min-h-[36px] inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-3"
        >
          <BackIcon className="w-4 h-4" />
          <span>{t.debts.backToDebts}</span>
        </button>

        <PageHeader
          title={debt ? debt.person_name : t.debts.title}
          subtitle={
            debt
              ? `${debt.direction === 'owed_to_me' ? t.debts.owedToMe : t.debts.iOwe} · ${
                  debt.status === 'settled' ? t.debts.statusSettled : t.debts.statusOpen
                } · ${formatDisplayDate(debt.date, language)}`
              : undefined
          }
          actions={
            debt && (
              <>
                <button
                  type="button"
                  onClick={openEditDebt}
                  className="min-h-[40px] px-3.5 py-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <Pencil className="w-4 h-4" />
                  <span>{t.debts.editDebt}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteDebtError(null);
                    setDeleteDebtOpen(true);
                  }}
                  className="min-h-[40px] px-3.5 py-2 inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t.common.delete}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openRepaymentModal(null)}
                  className="min-h-[40px] px-4 py-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.debts.addRepayment}</span>
                </button>
              </>
            )
          }
        />
      </div>

      <ErrorAlert error={error} onRetry={() => void loadDetail()} />

      {loading ? (
        <LoadingRows rows={4} />
      ) : debt ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.debts.originalAmount}</p>
              <div className="mt-1 text-xl font-semibold">
                <CurrencyAmount amount={debt.amount} currency={debt.currency} />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.debts.totalRepaid}</p>
              <div className="mt-1 text-xl font-semibold">
                <CurrencyAmount amount={debt.total_repaid} currency={debt.currency} tone="positive" />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.debts.remaining}</p>
              <div className="mt-1 text-xl font-semibold">
                <CurrencyAmount
                  amount={debt.remaining}
                  currency={debt.currency}
                  tone={debt.direction === 'owed_to_me' ? 'positive' : 'negative'}
                />
              </div>
            </div>
          </div>

          {debt.note && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
              <span className="font-medium">{t.common.note}:</span> {debt.note}
            </div>
          )}

          <section className="space-y-3">
            <h2 className="text-base font-semibold">{t.debts.repaymentsTitle}</h2>
            {!repaymentsRes || repaymentsRes.results.length === 0 ? (
              <EmptyState
                title={t.debts.noRepayments}
                action={
                  <button
                    type="button"
                    onClick={() => openRepaymentModal(null)}
                    className="min-h-[40px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium"
                  >
                    {t.debts.addRepayment}
                  </button>
                }
              />
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                {repaymentsRes.results.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {rep.account_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDisplayDate(rep.date, language)}
                        {rep.note ? ` · ${rep.note}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <CurrencyAmount
                        amount={rep.amount}
                        currency={debt.currency}
                        tone="positive"
                        className="text-sm font-semibold"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`${t.common.edit} ${rep.date}`}
                          onClick={() => openRepaymentModal(rep)}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`${t.common.delete} ${rep.date}`}
                          onClick={() => {
                            setDeleteRepError(null);
                            setDeleteRepTarget(rep);
                          }}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="px-4 pb-4">
                  <Pagination
                    page={page}
                    count={repaymentsRes.count}
                    hasNext={Boolean(repaymentsRes.next)}
                    hasPrevious={Boolean(repaymentsRes.previous)}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}

      {/* Edit Debt Modal */}
      <Modal
        open={editOpen}
        onClose={editBusy ? () => {} : () => setEditOpen(false)}
        title={t.debts.editDebt}
        footer={
          <>
            <button
              type="button"
              disabled={editBusy}
              onClick={() => setEditOpen(false)}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              form="edit-debt-form"
              disabled={editBusy}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
            >
              {editBusy ? t.common.loading : t.common.save}
            </button>
          </>
        }
      >
        <form id="edit-debt-form" onSubmit={handleSaveDebt} className="space-y-4">
          <ErrorAlert
            error={editError}
            onRefreshConflict={() => {
              setEditOpen(false);
              void loadDetail();
            }}
          />

          {debt?.origin === 'movement' && (
            <div>
              <label htmlFor="ed-debt-acc" className="block text-sm font-medium mb-1.5">
                {t.common.account}
              </label>
              <select
                id="ed-debt-acc"
                required
                value={editAccount}
                onChange={(e) => setEditAccount(e.target.value)}
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
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ed-debt-amt" className="block text-sm font-medium mb-1.5">
                {t.common.amount}
              </label>
              <input
                id="ed-debt-amt"
                type="text"
                inputMode="decimal"
                required
                dir="ltr"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
              />
            </div>
            <div>
              <label htmlFor="ed-debt-date" className="block text-sm font-medium mb-1.5">
                {t.common.date}
              </label>
              <input
                id="ed-debt-date"
                type="date"
                required
                dir="ltr"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ed-debt-note" className="block text-sm font-medium mb-1.5">
              {t.common.note}
            </label>
            <input
              id="ed-debt-note"
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </form>
      </Modal>

      {/* Repayment Modal */}
      <Modal
        open={repModalOpen}
        onClose={repBusy ? () => {} : () => setRepModalOpen(false)}
        title={editingRep ? t.debts.editRepayment : t.debts.addRepayment}
        footer={
          <>
            <button
              type="button"
              disabled={repBusy}
              onClick={() => setRepModalOpen(false)}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              form="repayment-form"
              disabled={repBusy}
              className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
            >
              {repBusy ? t.common.loading : t.common.save}
            </button>
          </>
        }
      >
        <form id="repayment-form" onSubmit={handleSaveRepayment} className="space-y-4">
          <ErrorAlert
            error={repError}
            onRefreshConflict={() => {
              setRepModalOpen(false);
              void loadDetail();
            }}
          />

          <div>
            <label htmlFor="rep-acc" className="block text-sm font-medium mb-1.5">
              {t.common.account}
            </label>
            <select
              id="rep-acc"
              required
              value={repAccount}
              onChange={(e) => setRepAccount(e.target.value)}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rep-amt" className="block text-sm font-medium mb-1.5">
                {t.common.amount} ({debt?.currency})
              </label>
              <input
                id="rep-amt"
                type="text"
                inputMode="decimal"
                required
                dir="ltr"
                value={repAmount}
                onChange={(e) => setRepAmount(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
              />
            </div>

            <div>
              <label htmlFor="rep-date" className="block text-sm font-medium mb-1.5">
                {t.common.date}
              </label>
              <input
                id="rep-date"
                type="date"
                required
                dir="ltr"
                value={repDate}
                onChange={(e) => setRepDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="rep-note" className="block text-sm font-medium mb-1.5">
              {t.common.note} <span className="text-xs text-slate-500">({t.common.optional})</span>
            </label>
            <input
              id="rep-note"
              type="text"
              value={repNote}
              onChange={(e) => setRepNote(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteDebtOpen}
        onClose={() => setDeleteDebtOpen(false)}
        onConfirm={handleDeleteDebt}
        title={t.debts.deleteDebtTitle}
        body={t.debts.deleteDebtBody}
        confirmLabel={t.common.delete}
        destructive
        busy={deletingDebt}
        error={deleteDebtError}
      />

      <ConfirmDialog
        open={Boolean(deleteRepTarget)}
        onClose={() => setDeleteRepTarget(null)}
        onConfirm={handleDeleteRepayment}
        title={t.debts.deleteRepaymentTitle}
        body={
          deleteRepTarget && debt
            ? t.debts.deleteRepaymentBody.replace(
                '{amount}',
                formatMoney(deleteRepTarget.amount, debt.currency, language)
              )
            : ''
        }
        confirmLabel={t.common.delete}
        destructive
        busy={deletingRep}
        error={deleteRepError}
      />
    </div>
  );
}
