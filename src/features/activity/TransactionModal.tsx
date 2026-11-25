import React, { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../api/client';
import { accountsApi, transactionsApi } from '../../api/endpoints';
import type {
  Account,
  ExpenseCategory,
  Transaction,
  TransactionKind,
} from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/useI18n';
import { getDeviceTimezone, todayYMD } from '../../utils/date';
import { computeExchangeReceived, type CurrencyCode } from '../../utils/money';
import { Modal } from '../../components/ui/Modal';
import { ErrorAlert } from '../../components/ui/ErrorAlert';

type EditableKind = Exclude<TransactionKind, 'debt_in' | 'debt_out'>;

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
  prefill?: {
    kind?: EditableKind;
    account?: number;
    category?: number | null;
    currency?: CurrencyCode;
    amount?: string;
    date?: string;
    note?: string;
  };
  customSubmit?: (payload: {
    account: number;
    destination: number | null;
    category: number | null;
    kind: EditableKind;
    currency: CurrencyCode;
    amount: string;
    exchange_rate: string | null;
    received_amount: string | null;
    date: string;
    note: string;
    timezone: string;
  }) => Promise<void>;
  customTitle?: string;
  customSubtitle?: string;
  onSaved: () => void | Promise<void>;
  onRefreshConflict?: () => void | Promise<void>;
}

export function TransactionModal({
  open,
  onClose,
  editingTransaction,
  prefill,
  customSubmit,
  customTitle,
  customSubtitle,
  onSaved,
  onRefreshConflict,
}: TransactionModalProps) {
  const { t, categoryLabel } = useI18n();
  const { settings } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);

  const [kind, setKind] = useState<EditableKind>('expense');
  const [accountId, setAccountId] = useState<string>('');
  const [destinationId, setDestinationId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [currency, setCurrency] = useState<CurrencyCode>('IQD');
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [date, setDate] = useState(() => todayYMD());
  const [note, setNote] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingLists(true);
    setError(null);
    Promise.all([
      accountsApi.listAllAccounts('false'),
      accountsApi.listAllCategories('false'),
    ])
      .then(([accs, cats]) => {
        if (!active) return;
        setAccounts(accs);
        setCategories(cats);

        if (editingTransaction) {
          const txKind: EditableKind =
            editingTransaction.kind === 'debt_in' || editingTransaction.kind === 'debt_out'
              ? 'expense'
              : editingTransaction.kind;
          setKind(txKind);
          setAccountId(String(editingTransaction.account));
          setDestinationId(
            editingTransaction.destination ? String(editingTransaction.destination) : ''
          );
          setCategoryId(
            editingTransaction.category ? String(editingTransaction.category) : ''
          );
          setCurrency(editingTransaction.currency);
          setAmount(editingTransaction.amount);
          setExchangeRate(editingTransaction.exchange_rate ?? '');
          setDate(editingTransaction.date);
          setNote(editingTransaction.note ?? '');
        } else {
          const defaultAcc =
            prefill?.account ??
            settings?.default_account ??
            (accs.length > 0 ? accs[0].id : undefined);
          const defaultCurr: CurrencyCode =
            prefill?.currency ??
            (settings?.default_currency === 'USD' ? 'USD' : 'IQD');
          setKind(prefill?.kind ?? 'expense');
          setAccountId(defaultAcc ? String(defaultAcc) : '');
          const otherAcc = accs.find((a) => a.id !== defaultAcc);
          setDestinationId(otherAcc ? String(otherAcc.id) : '');
          setCategoryId(
            prefill?.category
              ? String(prefill.category)
              : cats.length > 0
                ? String(cats[0].id)
                : ''
          );
          setCurrency(defaultCurr);
          setAmount(prefill?.amount ?? '');
          setExchangeRate(settings?.exchange_rate ?? '');
          setDate(prefill?.date ?? todayYMD());
          setNote(prefill?.note ?? '');
        }
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoadingLists(false);
      });

    return () => {
      active = false;
    };
  }, [open, editingTransaction, prefill, settings]);

  const calculatedExchange = useMemo(() => {
    if (kind !== 'exchange') return null;
    return computeExchangeReceived(amount, currency, exchangeRate);
  }, [kind, amount, currency, exchangeRate]);

  const targetCurrency: CurrencyCode = currency === 'IQD' ? 'USD' : 'IQD';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accountId) {
      setError(new Error('Please select an account.'));
      return;
    }

    const payload = {
      account: Number(accountId),
      destination: kind === 'transfer' && destinationId ? Number(destinationId) : null,
      category: kind === 'expense' && categoryId ? Number(categoryId) : null,
      kind,
      currency,
      amount: amount.trim(),
      exchange_rate: kind === 'exchange' ? exchangeRate.trim() || null : null,
      received_amount: kind === 'exchange' ? calculatedExchange : null,
      date,
      note: note.trim(),
      timezone: getDeviceTimezone(),
    };

    setBusy(true);
    try {
      if (customSubmit) {
        await customSubmit(payload);
      } else if (editingTransaction) {
        await transactionsApi.update(editingTransaction.id, {
          ...payload,
          version: editingTransaction.version,
        });
      } else {
        await transactionsApi.create(payload);
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const fieldErrors = error instanceof ApiError ? error.fieldErrors : {};
  const availableKinds: EditableKind[] = customSubmit
    ? [kind]
    : ['expense', 'income', 'transfer', 'exchange'];

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={
        customTitle ||
        (editingTransaction ? t.activity.editTransaction : t.activity.newTransaction)
      }
      subtitle={customSubtitle}
      size="lg"
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            form="transaction-form"
            disabled={busy || loadingLists || (kind === 'exchange' && !calculatedExchange)}
            className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white disabled:opacity-50 whitespace-nowrap"
          >
            {busy ? t.common.loading : editingTransaction ? t.common.save : t.common.create}
          </button>
        </>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4">
        <ErrorAlert
          error={error}
          onRefreshConflict={
            onRefreshConflict
              ? () => {
                  onClose();
                  void onRefreshConflict();
                }
              : undefined
          }
        />

        {/* Kind selector */}
        <div>
          <span className="block text-sm font-medium mb-1.5">{t.activity.kind}</span>
          <div className="grid grid-cols-4 gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            {availableKinds.map((k) => {
              const active = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={Boolean(editingTransaction && editingTransaction.kind !== k)}
                  onClick={() => setKind(k)}
                  className={`min-h-[44px] min-w-0 px-0.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  } disabled:opacity-40`}
                >
                  {t.activity.kinds[k]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tx-account" className="block text-sm font-medium mb-1.5">
              {kind === 'transfer' ? t.activity.sourceAccount : t.common.account}
            </label>
            <select
              id="tx-account"
              required
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">—</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            {fieldErrors.account && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {fieldErrors.account[0]}
              </p>
            )}
          </div>

          {kind === 'transfer' && (
            <div>
              <label htmlFor="tx-destination" className="block text-sm font-medium mb-1.5">
                {t.activity.destinationAccount}
              </label>
              <select
                id="tx-destination"
                required
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">—</option>
                {accounts
                  .filter((a) => String(a.id) !== accountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
              </select>
              {fieldErrors.destination && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.destination[0]}
                </p>
              )}
            </div>
          )}

          {kind === 'expense' && (
            <div>
              <label htmlFor="tx-category" className="block text-sm font-medium mb-1.5">
                {t.common.category}
              </label>
              <select
                id="tx-category"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">—</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {categoryLabel(cat)}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.category[0]}
                </p>
              )}
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
                  className={`min-h-[36px] rounded-md text-xs font-semibold transition-colors ${
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
            <label htmlFor="tx-amount" className="block text-sm font-medium mb-1.5">
              {t.common.amount}
            </label>
            <input
              id="tx-amount"
              type="text"
              inputMode="decimal"
              required
              dir="ltr"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={currency === 'IQD' ? '25000.00' : '25.00'}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
            />
            {fieldErrors.amount && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {fieldErrors.amount[0]}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="tx-date" className="block text-sm font-medium mb-1.5">
              {t.common.date}
            </label>
            <input
              id="tx-date"
              type="date"
              required
              dir="ltr"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-num text-sm"
            />
            {fieldErrors.date && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {fieldErrors.date[0]}
              </p>
            )}
          </div>
        </div>

        {kind === 'exchange' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tx-rate" className="block text-sm font-medium mb-1.5">
                  {t.activity.exchangeRate}
                </label>
                <input
                  id="tx-rate"
                  type="text"
                  inputMode="decimal"
                  required
                  dir="ltr"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="1310.000000"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-num text-sm"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t.activity.exchangeRateHint}
                </p>
                {fieldErrors.exchange_rate && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.exchange_rate[0]}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="tx-received" className="block text-sm font-medium mb-1.5">
                  {t.activity.receivedAmount} ({targetCurrency})
                </label>
                <input
                  id="tx-received"
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  value={calculatedExchange ?? ''}
                  disabled
                  placeholder="0.00"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-mono-num text-sm disabled:opacity-100"
                />
                {fieldErrors.received_amount && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.received_amount[0]}
                  </p>
                )}
              </div>
            </div>

          </div>
        )}

        <div>
          <label htmlFor="tx-note" className="block text-sm font-medium mb-1.5">
            {t.common.note} <span className="text-xs text-slate-500">({t.common.optional})</span>
          </label>
          <input
            id="tx-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
          {fieldErrors.note && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {fieldErrors.note[0]}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
