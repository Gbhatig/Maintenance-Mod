'use client';

import React, { useState } from 'react';
import { X, Search, ChevronDown, Check } from 'lucide-react';

interface Option {
  id: string;
  name: string;
  subtitle?: string;
}

interface ChipMultiSelectProps {
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  label?: string;
}

export default function ChipMultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select items...',
  label,
}: ChipMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(
    (opt) =>
      opt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opt.subtitle && opt.subtitle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id));

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    const visibleIds = filteredOptions.map((opt) => opt.id);
    const combined = Array.from(new Set([...selectedIds, ...visibleIds]));
    onChange(combined);
  };

  const handleRemoveChip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  return (
    <div className="space-y-1.5 relative">
      {label && <label className="block text-xs font-semibold text-slate-700">{label}</label>}

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[40px] p-2 bg-white border border-[#E0E3E8] hover:border-[#1E63C4] rounded-[6px] flex flex-wrap items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
      >
        {selectedOptions.length > 0 ? (
          selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-[#1E63C4] text-xs font-semibold rounded-[4px]"
            >
              <span>{opt.name}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveChip(opt.id, e)}
                className="hover:text-red-600 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400 pl-1">{placeholder}</span>
        )}

        <ChevronDown className="w-4 h-4 text-slate-400 ml-auto shrink-0" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E0E3E8] rounded-[6px] shadow-xl z-50 p-3 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 mr-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#F5F7FB] border border-[#E0E3E8] rounded-[4px] text-xs text-slate-700 focus:outline-none focus:border-[#1E63C4]"
              />
            </div>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-semibold text-[#1E63C4] hover:underline shrink-0"
            >
              Select All
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pt-1">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 text-center">No options match</p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleToggle(opt.id)}
                    className={`flex items-center justify-between p-2 rounded-[4px] text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 text-[#1E63C4] font-semibold' : 'hover:bg-[#F5F7FB] text-slate-700'
                    }`}
                  >
                    <div>
                      <span>{opt.name}</span>
                      {opt.subtitle && <span className="text-[11px] text-slate-400 block">{opt.subtitle}</span>}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#1E63C4]" />}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-[#E0E3E8] flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-[#2E3A87] text-white text-xs font-semibold rounded-[4px]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
