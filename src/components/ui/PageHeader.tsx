import React from 'react';
import { useI18n } from '../../i18n/useI18n';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  actionsClassName?: string;
}

export function PageHeader({ title, subtitle, actions, actionsClassName = '' }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className={`flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0 ${actionsClassName}`}>{actions}</div>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 px-6 py-10 text-center">
      <p className="text-base font-medium text-slate-900 dark:text-slate-100">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3" role="status" aria-label={t.common.loading} aria-busy="true">
      <span className="sr-only">{t.common.loading}</span>
      <div aria-hidden="true" className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="penny-skeleton h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className={`penny-skeleton h-3 rounded ${index % 2 === 0 ? 'w-2/5' : 'w-3/5'}`} />
              <div className="penny-skeleton h-2.5 w-3/4 rounded" />
            </div>
            <div className="penny-skeleton h-4 w-12 shrink-0 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
