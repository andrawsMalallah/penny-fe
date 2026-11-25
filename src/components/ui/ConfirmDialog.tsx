import { Modal } from './Modal';
import { useI18n } from '../../i18n/useI18n';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  body: string;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  error?: string | null;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  destructive = false,
  busy = false,
  error,
}: ConfirmDialogProps) {
  const { t } = useI18n();

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
            className={`min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 whitespace-nowrap shrink-0 transition-colors ${
              destructive
                ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500'
                : 'bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500'
            }`}
          >
            {busy ? t.common.loading : confirmLabel || t.common.confirm}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{body}</p>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      )}
    </Modal>
  );
}
