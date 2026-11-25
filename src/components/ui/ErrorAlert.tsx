import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ApiError } from '../../api/client';
import { useI18n } from '../../i18n/useI18n';

interface ErrorAlertProps {
  error: unknown;
  onRefreshConflict?: () => void;
  onRetry?: () => void;
}

export function ErrorAlert({ error, onRefreshConflict, onRetry }: ErrorAlertProps) {
  const { t } = useI18n();
  if (!error) return null;

  const isConflict = error instanceof ApiError && error.isConflict;
  const isUnavailable = error instanceof ApiError && error.isServiceUnavailable;
  const message =
    isUnavailable
      ? t.common.serviceUnavailable
      : error instanceof Error
        ? error.message
        : String(error);

  return (
    <div
      role="alert"
      className={`rounded-xl border px-4 py-3 text-sm ${
        isConflict
          ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
          : 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0 space-y-1">
          {isConflict && (
            <p className="font-semibold">{t.common.conflictTitle}</p>
          )}
          <p className="leading-relaxed">
            {isConflict ? t.common.conflictMessage : message}
          </p>
          {isConflict && onRefreshConflict && (
            <div className="pt-1.5">
              <button
                type="button"
                onClick={onRefreshConflict}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900 text-white dark:bg-amber-600 hover:bg-amber-800 text-xs font-medium whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.common.refreshRecord}</span>
              </button>
            </div>
          )}
          {!isConflict && onRetry && (
            <div className="pt-1.5">
              <button
                type="button"
                onClick={onRetry}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 text-white hover:bg-red-800 text-xs font-medium whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.common.retry}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
