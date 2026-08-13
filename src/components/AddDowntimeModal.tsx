'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Cpu, Tag, Plus, Check } from 'lucide-react';
import MachineSelectModal from './MachineSelectModal';

interface Machine {
  id: string;
  code: string;
  name: string;
  criticality: string;
  liveStatus: string;
  section?: { code: string; name: string };
}

interface FaultNature {
  id: string;
  code: string;
  name: string;
}

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
}

interface AddDowntimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  departments: Department[];
  faultNatures: FaultNature[];
  employees: Employee[];
  siteId: string;
  onDowntimeAdded: () => void;
}

export default function AddDowntimeModal({
  isOpen,
  onClose,
  machines,
  departments,
  faultNatures,
  employees,
  siteId,
  onDowntimeAdded,
}: AddDowntimeModalProps) {
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);

  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [faultNatureId, setFaultNatureId] = useState(faultNatures[0]?.id || '');
  const [reportedById, setReportedById] = useState(employees[0]?.id || '');

  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [typeOfFault, setTypeOfFault] = useState<'MAN' | 'MACHINE' | 'MATERIAL' | 'METHOD'>('MACHINE');
  const [isPlanned, setIsPlanned] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Multi-chip labels
  const [labels, setLabels] = useState<string[]>(['HYDRAULICS', 'PRODUCTION_STOP']);
  const [newTagInput, setNewTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (newTagInput.trim() && !labels.includes(newTagInput.trim().toUpperCase())) {
      setLabels([...labels, newTagInput.trim().toUpperCase()]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setLabels(labels.filter((l) => l !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedMachineIds.length === 0) {
      setError('Please select at least one machine for downtime logging.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/v1/sites/${siteId}/maintenance/downtimes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineIds: selectedMachineIds,
          departmentId: departmentId || departments[0]?.id,
          faultNatureId: faultNatureId || faultNatures[0]?.id,
          reportedById: reportedById || employees[0]?.id,
          severity,
          typeOfFault,
          isPlanned,
          remarks,
          labels,
          startTime: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to log downtime event');
      }

      onDowntimeAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedMachinesInfo = machines.filter((m) => selectedMachineIds.includes(m.id));

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/40 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Log Downtime Breakdown Event</h2>
                <p className="text-xs text-slate-400">Record operational stoppage, set machine status to DOWN</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Spec 1.1: Multi-select machine trigger button */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Target Machines <span className="text-rose-400">*</span>
              </label>

              <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl min-h-[52px]">
                {selectedMachinesInfo.length > 0 ? (
                  selectedMachinesInfo.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold rounded-lg"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>{m.code}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMachineIds(selectedMachineIds.filter((id) => id !== m.id))}
                        className="hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No machines selected</span>
                )}

                <button
                  type="button"
                  onClick={() => setIsMachineModalOpen(true)}
                  className="ml-auto px-4 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {selectedMachineIds.length > 0
                      ? `Select More (${selectedMachineIds.length})`
                      : 'Choose Machines'}
                  </span>
                </button>
              </div>
            </div>

            {/* 4M Fault Type & Planned Radio Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 4M Radio Options */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  4M Category Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['MAN', 'MACHINE', 'MATERIAL', 'METHOD'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTypeOfFault(type)}
                      className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition-all ${
                        typeOfFault === type
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Planned vs Unplanned Radio */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Event Category
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlanned(false)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                      !isPlanned
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>Unplanned Breakdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPlanned(true)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                      isPlanned
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>Planned Maintenance</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Department & Fault Nature */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Reporting Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Fault Nature Category
                </label>
                <select
                  value={faultNatureId}
                  onChange={(e) => setFaultNatureId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {faultNatures.map((fn) => (
                    <option key={fn.id} value={fn.id}>
                      {fn.name} ({fn.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Severity Radio Buttons & Reported By */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Severity Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition-all ${
                        severity === sev
                          ? sev === 'CRITICAL'
                            ? 'bg-rose-600 text-white border-rose-400'
                            : sev === 'HIGH'
                            ? 'bg-amber-600 text-white border-amber-400'
                            : 'bg-blue-600 text-white border-blue-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Reported By Staff
                </label>
                <select
                  value={reportedById}
                  onChange={(e) => setReportedById(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Multi-chip Tags */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Event Labels & Tags (Multi-chip)
              </label>
              <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                {labels.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 text-slate-200 text-xs font-medium rounded-lg border border-slate-700"
                  >
                    <Tag className="w-3 h-3 text-blue-400" />
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-rose-400 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none px-2 py-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Breakdown Description & Remarks
              </label>
              <textarea
                rows={3}
                placeholder="Describe breakdown symptoms, initial observation, root cause..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Submit Footer */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center space-x-2"
              >
                {loading ? (
                  <span>Logging Event...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Log Breakdown Event</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Machine Select Sub-Modal */}
      <MachineSelectModal
        isOpen={isMachineModalOpen}
        onClose={() => setIsMachineModalOpen(false)}
        machines={machines}
        selectedMachineIds={selectedMachineIds}
        onSelectMachines={(ids) => setSelectedMachineIds(ids)}
      />
    </>
  );
}
