import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import { useDialogFocus } from './useDialogFocus';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
}: ModalProps) {
  const { t } = useI18n();
  const dialogRef = useDialogFocus(open, onClose);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
    >
      <div
        className="fixed inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className={`penny-dialog relative z-10 w-full ${SIZE_CLASSES[size]} max-h-[calc(100dvh-1.5rem)] sm:max-h-[92dvh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-4 px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <h2
              id="modal-heading"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-snug"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            data-dialog-initial-focus
            onClick={onClose}
            aria-label={t.common.close}
            className="min-h-[44px] min-w-[44px] -m-1.5 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          {children}
        </div>

        {footer && (
          <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex flex-wrap items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
