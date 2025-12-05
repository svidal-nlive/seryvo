import { ReactNode, useState, useCallback, useRef, KeyboardEvent } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// ---- Types ----

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => ReactNode;
  /** Screen reader description for this column */
  ariaLabel?: string;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  sortState?: SortState;
  onSort?: (column: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  striped?: boolean;
  compact?: boolean;
  stickyHeader?: boolean;
  /** Accessible label for the table */
  'aria-label'?: string;
  /** Caption for the table (visible or sr-only) */
  caption?: string;
  /** Hide caption visually (still available to screen readers) */
  captionHidden?: boolean;
  /** Enable keyboard navigation between rows */
  keyboardNavigation?: boolean;
}

// ---- Component ----

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  sortState,
  onSort,
  loading = false,
  emptyMessage = 'No data available',
  striped = true,
  compact = false,
  stickyHeader = false,
  'aria-label': ariaLabel,
  caption,
  captionHidden = true,
  keyboardNavigation = true,
}: TableProps<T>) {
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const tableRef = useRef<HTMLTableElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const getCellValue = (row: T, key: string): any => {
    const keys = key.split('.');
    let value: any = row;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  };

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable || !sortState) {
      return null;
    }

    const isSorted = sortState.column === column.key;
    const direction = sortState.direction;

    if (isSorted && direction === 'asc') {
      return <ChevronUp size={14} className="inline ml-1" aria-hidden="true" />;
    } else if (isSorted && direction === 'desc') {
      return <ChevronDown size={14} className="inline ml-1" aria-hidden="true" />;
    }
    return <ChevronsUpDown size={14} className="inline ml-1 opacity-40" aria-hidden="true" />;
  };

  const getSortAriaLabel = (column: Column<T>) => {
    if (!column.sortable) return undefined;
    
    const isSorted = sortState?.column === column.key;
    const direction = sortState?.direction;
    
    if (isSorted && direction === 'asc') {
      return `${column.header}, sorted ascending. Click to sort descending.`;
    } else if (isSorted && direction === 'desc') {
      return `${column.header}, sorted descending. Click to remove sort.`;
    }
    return `${column.header}. Click to sort ascending.`;
  };

  const handleHeaderClick = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  const handleHeaderKeyDown = (e: KeyboardEvent, column: Column<T>) => {
    if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleHeaderClick(column);
    }
  };

  const handleRowKeyDown = useCallback((e: KeyboardEvent, row: T, rowIndex: number) => {
    if (!keyboardNavigation) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < data.length - 1) {
          setFocusedRowIndex(rowIndex + 1);
          rowRefs.current[rowIndex + 1]?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setFocusedRowIndex(rowIndex - 1);
          rowRefs.current[rowIndex - 1]?.focus();
        }
        break;
      case 'Enter':
      case ' ':
        if (onRowClick) {
          e.preventDefault();
          onRowClick(row);
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedRowIndex(0);
        rowRefs.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        setFocusedRowIndex(data.length - 1);
        rowRefs.current[data.length - 1]?.focus();
        break;
    }
  }, [data.length, keyboardNavigation, onRowClick]);

  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  const headerPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700" role="region" aria-label={ariaLabel || caption || 'Data table'}>
      <table 
        ref={tableRef}
        className="min-w-full divide-y divide-gray-200 dark:divide-slate-700"
        role="grid"
        aria-rowcount={data.length + 1}
        aria-colcount={columns.length}
      >
        {caption && (
          <caption className={captionHidden ? 'sr-only' : 'text-left text-sm text-gray-600 dark:text-slate-400 p-3'}>
            {caption}
          </caption>
        )}
        <thead className={`bg-gray-50 dark:bg-slate-800 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
          <tr role="row">
            {columns.map((column, colIndex) => (
              <th
                key={column.key}
                scope="col"
                role="columnheader"
                aria-colindex={colIndex + 1}
                aria-sort={
                  sortState?.column === column.key
                    ? sortState.direction === 'asc'
                      ? 'ascending'
                      : sortState.direction === 'desc'
                      ? 'descending'
                      : 'none'
                    : undefined
                }
                aria-label={getSortAriaLabel(column)}
                tabIndex={column.sortable ? 0 : undefined}
                onKeyDown={(e) => handleHeaderKeyDown(e, column)}
                className={`${headerPadding} text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 ${
                  column.align === 'center'
                    ? 'text-center'
                    : column.align === 'right'
                    ? 'text-right'
                    : 'text-left'
                } ${column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset' : ''}`}
                style={{ width: column.width }}
                onClick={() => handleHeaderClick(column)}
              >
                {column.header}
                {getSortIcon(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
          {loading ? (
            <tr role="row">
              <td colSpan={columns.length} className={`${cellPadding} text-center text-gray-500 dark:text-slate-400`} role="gridcell">
                <div className="flex items-center justify-center gap-2" role="status" aria-live="polite">
                  <div className="w-4 h-4 border-2 border-gray-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin" aria-hidden="true" />
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr role="row">
              <td colSpan={columns.length} className={`${cellPadding} text-center text-gray-500 dark:text-slate-400`} role="gridcell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={keyExtractor(row)}
                ref={(el) => { rowRefs.current[rowIndex] = el; }}
                role="row"
                aria-rowindex={rowIndex + 2}
                tabIndex={onRowClick || keyboardNavigation ? (focusedRowIndex === rowIndex ? 0 : -1) : undefined}
                onKeyDown={(e) => handleRowKeyDown(e, row, rowIndex)}
                onFocus={() => setFocusedRowIndex(rowIndex)}
                className={`
                  ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800' : ''}
                  ${striped && rowIndex % 2 === 1 ? 'bg-gray-50/50 dark:bg-slate-800/50' : ''}
                  ${focusedRowIndex === rowIndex ? 'ring-2 ring-blue-500 ring-inset' : ''}
                  transition-colors focus:outline-none
                `}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column, colIndex) => {
                  const value = getCellValue(row, column.key);
                  return (
                    <td
                      key={column.key}
                      role="gridcell"
                      aria-colindex={colIndex + 1}
                      className={`${cellPadding} text-sm text-gray-900 dark:text-slate-200 ${
                        column.align === 'center'
                          ? 'text-center'
                          : column.align === 'right'
                          ? 'text-right'
                          : 'text-left'
                      }`}
                    >
                      {column.render ? column.render(value, row, rowIndex) : value ?? '—'}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---- Pagination Component ----

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  /** Accessible label for pagination */
  'aria-label'?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  'aria-label': ariaLabel = 'Table pagination',
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pages = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const buttonBaseClass = `
    px-3 py-1.5 text-sm rounded border min-h-[36px] min-w-[36px]
    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
    dark:focus-visible:ring-offset-slate-900 touch-manipulation
  `;

  return (
    <nav 
      className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700"
      aria-label={ariaLabel}
      role="navigation"
    >
      <div className="text-sm text-gray-500 dark:text-slate-400" aria-live="polite">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </div>

      <ul className="flex items-center gap-1" role="list">
        <li>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Go to previous page"
            aria-disabled={currentPage === 1}
            className={`${buttonBaseClass} border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Previous
          </button>
        </li>

        {startPage > 1 && (
          <>
            <li>
              <button
                onClick={() => onPageChange(1)}
                aria-label="Go to page 1"
                className={`${buttonBaseClass} border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800`}
              >
                1
              </button>
            </li>
            {startPage > 2 && (
              <li aria-hidden="true">
                <span className="px-2 text-gray-400">...</span>
              </li>
            )}
          </>
        )}

        {pages.map((page) => (
          <li key={page}>
            <button
              onClick={() => onPageChange(page)}
              aria-label={`Go to page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              className={`${buttonBaseClass} ${
                page === currentPage
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              {page}
            </button>
          </li>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <li aria-hidden="true">
                <span className="px-2 text-gray-400">...</span>
              </li>
            )}
            <li>
              <button
                onClick={() => onPageChange(totalPages)}
                aria-label={`Go to page ${totalPages}`}
                className={`${buttonBaseClass} border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800`}
              >
                {totalPages}
              </button>
            </li>
          </>
        )}

        <li>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Go to next page"
            aria-disabled={currentPage === totalPages}
            className={`${buttonBaseClass} border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
