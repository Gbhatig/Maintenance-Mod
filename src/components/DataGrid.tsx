'use client';

import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Trash2, Edit } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  searchable?: boolean;
}

interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];
  totalRecords: number;
  page: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onSearchChange?: (columnKey: string, value: string) => void;
  onDelete?: (row: T) => void;
  onEdit?: (row: T) => void;
  loading?: boolean;
}

export default function DataGrid<T extends { id: string }>({
  columns,
  data,
  totalRecords,
  page,
  pageSize,
  onPageChange,
  onSearchChange,
  onDelete,
  onEdit,
  loading = false,
}: DataGridProps<T>) {
  const [columnSearches, setColumnSearches] = useState<Record<string, string>>({});

  const handleSearchInput = (key: string, val: string) => {
    setColumnSearches((prev) => ({ ...prev, [key]: val }));
    if (onSearchChange) {
      onSearchChange(key, val);
    }
  };

  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  return (
    <div className="bg-white border border-[#E0E3E8] rounded-[6px] shadow-sm flex flex-col overflow-hidden text-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs text-left">
          <thead>
            {/* Header Row */}
            <tr className="bg-[#2E3A87] text-white font-semibold">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 border-r border-[#3b49a2] whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span>{col.header}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60 ml-1" />
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && <th className="px-4 py-3 text-center whitespace-nowrap">Actions</th>}
            </tr>

            {/* Per-Column Search Row */}
            <tr className="bg-[#F5F7FB] border-b border-[#E0E3E8]">
              {columns.map((col) => (
                <td key={col.key} className="p-2 border-r border-[#E0E3E8]">
                  {col.searchable !== false ? (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={`Search ${col.header}...`}
                        value={columnSearches[col.key] || ''}
                        onChange={(e) => handleSearchInput(col.key, e.target.value)}
                        className="w-full pl-7 pr-2 py-1 bg-white border border-[#E0E3E8] rounded-[4px] text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#1E63C4]"
                      />
                    </div>
                  ) : null}
                </td>
              ))}
              {(onEdit || onDelete) && <td className="p-2 bg-[#F5F7FB]"></td>}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E0E3E8]">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="py-8 text-center text-slate-400 italic">
                  Loading data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="py-8 text-center text-slate-400 italic">
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`hover:bg-blue-50/50 transition-colors ${
                    idx % 2 === 1 ? 'bg-[#F5F7FB]' : 'bg-white'
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 border-r border-[#E0E3E8]/60 text-slate-700">
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3 text-center space-x-2 whitespace-nowrap">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="p-1 text-[#1E63C4] hover:bg-blue-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          className="p-1 text-[#D93025] hover:bg-red-100 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#F5F7FB] border-t border-[#E0E3E8] text-xs text-slate-600">
        <div>
          Showing <span className="font-semibold">{data.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
          <span className="font-semibold">{Math.min(page * pageSize, totalRecords)}</span> of{' '}
          <span className="font-semibold">{totalRecords}</span> entries
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 border border-[#E0E3E8] bg-white hover:bg-slate-100 rounded disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 border border-[#E0E3E8] bg-white hover:bg-slate-100 rounded disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
