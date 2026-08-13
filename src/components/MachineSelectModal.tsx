'use client';

import React, { useState } from 'react';
import { X, Search, CheckSquare, Square, Layers } from 'lucide-react';

interface Machine {
  id: string;
  code: string;
  name: string;
  criticality: string;
  liveStatus: string;
  section?: { code: string; name: string };
}

interface MachineSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  selectedMachineIds: string[];
  onSelectMachines: (ids: string[]) => void;
}

export default function MachineSelectModal({
  isOpen,
  onClose,
  machines,
  selectedMachineIds,
  onSelectMachines,
}: MachineSelectModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  if (!isOpen) return null;

  const sections = Array.from(new Set(machines.map((m) => m.section?.code).filter(Boolean)));

  const filteredMachines = machines.filter((m) => {
    const matchesSearch =
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = selectedSection === 'ALL' || m.section?.code === selectedSection;
    return matchesSearch && matchesSection;
  });

  const handleToggleMachine = (id: string) => {
    if (selectedMachineIds.includes(id)) {
      onSelectMachines(selectedMachineIds.filter((mId) => mId !== id));
    } else {
      onSelectMachines([...selectedMachineIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredMachines.map((m) => m.id);
    const combined = Array.from(new Set([...selectedMachineIds, ...filteredIds]));
    onSelectMachines(combined);
  };

  const handleRemoveAll = () => {
    onSelectMachines([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Select Target Machines</h3>
              <p className="text-xs text-slate-400">Choose one or more machines for downtime logging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls & Badge */}
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search machine code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-full">
                {selectedMachineIds.length} Selected
              </span>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleRemoveAll}
                className="px-3 py-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors"
              >
                Remove All
              </button>
            </div>
          </div>

          {/* Section Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedSection('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedSection === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Sections
            </button>
            {sections.map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec as string)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  selectedSection === sec
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        {/* Machine List Grid */}
        <div className="px-6 pb-6 overflow-y-auto flex-1 space-y-2 max-h-80">
          {filteredMachines.map((m) => {
            const isSelected = selectedMachineIds.includes(m.id);
            return (
              <div
                key={m.id}
                onClick={() => handleToggleMachine(m.id)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500/40 text-slate-100 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-blue-400">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 fill-blue-500/20" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-slate-100">{m.code}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          m.criticality === 'A'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : m.criticality === 'B'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        Class-{m.criticality}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{m.name}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-400">{m.section?.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      m.liveStatus === 'RUNNING'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {m.liveStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            Confirm Selection ({selectedMachineIds.length})
          </button>
        </div>
      </div>
    </div>
  );
}
