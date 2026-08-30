'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Plus, Inbox } from 'lucide-react';
import { Button } from './Button';
import { Pagination } from './Pagination';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  title?: string;
  subtitle?: string;
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  onAddNew?: () => void;
  addNewLabel?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  filterComponent?: React.ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
  pageSize?: number;
}

export function DataTable<T>({
  title,
  subtitle,
  columns,
  data,
  keyExtractor,
  isLoading = false,
  onAddNew,
  addNewLabel = 'Add New',
  searchPlaceholder = 'Search records...',
  searchValue,
  onSearchChange,
  filterComponent,
  emptyTitle = 'No records found',
  emptySubtitle = 'Try adjusting your search query or filters, or add a new record.',
  pageSize = 10,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  const search = searchValue !== undefined ? searchValue : internalSearch;
  const handleSearch = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    else setInternalSearch(val);
    setCurrentPage(1);
  };

  const handleSort = (key?: keyof T) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const processedData = useMemo(() => {
    let list = [...data];

    if (sortKey) {
      list.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
      });
    }

    return list;
  }, [data, sortKey, sortDirection]);

  const totalPages = Math.ceil(processedData.length / currentPageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * currentPageSize;
    return processedData.slice(start, start + currentPageSize);
  }, [processedData, currentPage, currentPageSize]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header Bar */}
      {(title || onAddNew || onSearchChange || searchValue !== undefined || filterComponent) && (
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          <div>
            {title && <h2 className="text-base font-bold text-slate-900 tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 ps-8 pe-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Filter Slot */}
            {filterComponent}

            {/* Add New Button */}
            {onAddNew && (
              <Button
                variant="primary"
                size="sm"
                onClick={onAddNew}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {addNewLabel}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-start">
          <thead className="bg-slate-50/75 border-b border-slate-200/80 text-slate-600 uppercase text-2xs font-bold tracking-wider">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => col.sortable && handleSort(col.accessorKey)}
                  className={`px-4 py-3 text-start font-bold ${col.className || ''} ${
                    col.sortable ? 'cursor-pointer select-none hover:text-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.header}</span>
                    {col.sortable && sortKey === col.accessorKey && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-4 py-3.5">
                      <div className="h-4 bg-slate-100 rounded-md w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                      <Inbox className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">{emptyTitle}</p>
                    <p className="text-xs text-slate-500 mt-1 text-center leading-relaxed">
                      {emptySubtitle}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="hover:bg-slate-50/75 transition-colors group"
                >
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-4 py-3 text-slate-800 ${col.className || ''}`}>
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? (row[col.accessorKey] as any)
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && processedData.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedData.length}
          pageSize={currentPageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => {
            setCurrentPageSize(sz);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
}
