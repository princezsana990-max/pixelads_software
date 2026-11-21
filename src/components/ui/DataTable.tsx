import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Button } from './Button';
import { SkeletonTable } from './Skeleton';
import { EmptyState } from './EmptyState';
import { twMerge } from 'tailwind-merge';

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  currentPage?: number;
  totalPages?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display matching your criteria.',
  emptyActionLabel,
  onEmptyAction,
  currentPage = 1,
  totalPages = 1,
  totalRecords,
  onPageChange,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return <SkeletonTable rows={5} columns={columns.length} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className={twMerge('w-full rounded-xl border border-border bg-bg-surface overflow-hidden shadow-card', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-bg-secondary text-[12px] font-semibold tracking-wider text-fg-secondary uppercase">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={twMerge('px-4 py-3.5 select-none whitespace-nowrap', col.headerClassName)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm text-fg-primary">
            {data.map((row, index) => (
              <tr
                key={keyExtractor(row)}
                className="hover:bg-brand-500/[0.03] transition-colors group"
              >
                {columns.map((col) => (
                  <td key={col.key} className={twMerge('px-4 py-3.5 align-middle', col.className)}>
                    {col.render ? col.render(row, index) : (row as any)[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border bg-bg-surface gap-3 text-xs text-fg-secondary">
          <div>
            {totalRecords !== undefined ? (
              <span>
                Showing page <strong className="text-fg-primary">{currentPage}</strong> of{' '}
                <strong className="text-fg-primary">{totalPages}</strong> ({totalRecords} records)
              </span>
            ) : (
              <span>
                Page <strong className="text-fg-primary">{currentPage}</strong> of{' '}
                <strong className="text-fg-primary">{totalPages}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              icon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              icon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
