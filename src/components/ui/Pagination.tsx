import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';

interface PaginationProps {
  page: number;
  count: number;
  pageSize?: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (nextPage: number) => void;
}

export function paginationPageCount(count: number, pageSize = 30): number {
  return Math.max(1, Math.ceil(count / Math.max(1, pageSize)));
}

export function Pagination({
  page,
  count,
  pageSize = 30,
  hasNext,
  hasPrevious,
  onPageChange,
}: PaginationProps) {
  const { t, dir, format } = useI18n();
  const totalPages = paginationPageCount(count, pageSize);

  if (count === 0 || (!hasNext && !hasPrevious && page === 1)) {
    return count > 0 ? (
      <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
        {format(t.common.showingCount, { count })}
      </div>
    ) : null;
  }

  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
      <div className="text-xs text-slate-600 dark:text-slate-400 tabular-nums flex items-center gap-2">
        <span>{format(t.common.showingCount, { count })}</span>
        <span aria-hidden="true">·</span>
        <span>{format(t.common.pageOf, { page, total: totalPages })}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasPrevious || page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="min-h-[40px] px-3 py-1.5 inline-flex items-center gap-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap shrink-0"
        >
          <PrevIcon className="w-4 h-4" />
          <span>{t.common.previous}</span>
        </button>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          className="min-h-[40px] px-3 py-1.5 inline-flex items-center gap-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap shrink-0"
        >
          <span>{t.common.next}</span>
          <NextIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
