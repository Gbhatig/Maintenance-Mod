'use client';

import React, { useState, useEffect } from 'react';
import DataGrid, { Column } from '@/components/DataGrid';
import TimeRangePicker from '@/components/TimeRangePicker';
import { Clock, Plus, Moon, Sun, RefreshCw } from 'lucide-react';

interface Shift {
  id: string;
  site_id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_overnight: boolean;
  break_minutes: number;
  gross_minutes: number;
  net_minutes: number;
  working_days: number[];
  site?: { name: string; code: string };
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ShiftsMasterPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<any[]>([]);

  // Form Modal State (Create or Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    site_id: '',
    name: '',
    start_time: '08:00',
    end_time: '20:00',
    break_minutes: 30,
    working_days: [1, 2, 3, 4, 5],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/shifts');
      const result = await res.json();
      if (res.ok) {
        setShifts(result.data || []);
      }
    } catch (err) {
      console.error('Fetch shifts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/v1/sites');
      if (res.ok) {
        const result = await res.json();
        const siteList = result.data || [];
        setSites(siteList);
        if (siteList.length > 0 && !formData.site_id) {
          setFormData((prev) => ({ ...prev, site_id: siteList[0].id }));
        }
      }
    } catch (err) {
      console.error('Fetch sites error:', err);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchSites();
  }, []);

  const handleOpenCreate = () => {
    setEditingShiftId(null);
    setFormData({
      site_id: sites[0]?.id || '',
      name: '',
      start_time: '08:00',
      end_time: '20:00',
      break_minutes: 30,
      working_days: [1, 2, 3, 4, 5],
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setFormData({
      site_id: shift.site_id,
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_minutes: shift.break_minutes,
      working_days: shift.working_days || [1, 2, 3, 4, 5],
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      const isEdit = !!editingShiftId;
      const url = isEdit ? `/api/v1/shifts/${editingShiftId}` : '/api/v1/shifts';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.error?.fields) {
          setFormErrors(result.error.fields);
        } else if (result.error?.message) {
          setFormErrors({ general: result.error.message });
        }
        return;
      }

      setIsModalOpen(false);
      fetchShifts();
    } catch (err: any) {
      setFormErrors({ general: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (shift: Shift) => {
    if (!confirm(`Are you sure you want to delete shift "${shift.name}"?`)) return;
    try {
      await fetch(`/api/v1/shifts/${shift.id}`, { method: 'DELETE' });
      fetchShifts();
    } catch (err) {
      console.error('Delete shift error:', err);
    }
  };

  const handleDayToggle = (dayIdx: number) => {
    if (formData.working_days.includes(dayIdx)) {
      setFormData({
        ...formData,
        working_days: formData.working_days.filter((d) => d !== dayIdx),
      });
    } else {
      setFormData({
        ...formData,
        working_days: [...formData.working_days, dayIdx].sort(),
      });
    }
  };

  const columns: Column<Shift>[] = [
    { key: 'name', header: 'Shift Name', render: (r) => <span className="font-bold text-[#2E3A87]">{r.name}</span> },
    { key: 'site', header: 'Site', render: (r) => r.site?.name || 'N/A' },
    {
      key: 'timing',
      header: 'Shift Timing',
      render: (r) => (
        <div className="font-mono text-xs font-semibold text-slate-800">
          {r.start_time} — {r.end_time}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Shift Type',
      render: (r) => (
        <span
          className={`px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold flex items-center space-x-1 w-max ${
            r.is_overnight ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {r.is_overnight ? <Moon className="w-3 h-3 mr-1 inline" /> : <Sun className="w-3 h-3 mr-1 inline" />}
          <span>{r.is_overnight ? 'Overnight' : 'Day'}</span>
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Gross / Net Duration',
      render: (r) => (
        <div className="text-[11px] text-slate-600">
          <span>Gross: <strong>{(r.gross_minutes / 60).toFixed(1)}h</strong></span> |{' '}
          <span className="text-[#1E63C4]">Net: <strong>{(r.net_minutes / 60).toFixed(1)}h</strong></span> (Break: {r.break_minutes}m)
        </div>
      ),
    },
    {
      key: 'working_days',
      header: 'Working Days',
      render: (r) => (
        <div className="flex items-center space-x-1">
          {dayNames.map((d, i) => (
            <span
              key={d}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                r.working_days.includes(i) ? 'bg-[#2E3A87] text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {d[0]}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-[6px] border border-[#E0E3E8] shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-[6px] text-[#1E63C4]">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2E3A87]">Shifts Master Registry</h1>
            <p className="text-xs text-slate-500">Configure plant shifts, operating hours, breaks, overnight schedules, and working days</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchShifts}
            className="px-3.5 py-2 border border-[#E0E3E8] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-[4px] flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-[#2E3A87] hover:bg-[#232d69] text-white text-xs font-bold rounded-[4px] shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ NEW SHIFT</span>
          </button>
        </div>
      </div>

      {/* DataGrid */}
      <DataGrid
        columns={columns}
        data={shifts}
        totalRecords={shifts.length}
        page={1}
        pageSize={50}
        onPageChange={() => {}}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Add / Edit Shift Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-[#E0E3E8] rounded-[6px] w-full max-w-xl shadow-2xl p-6 space-y-4 my-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#E0E3E8] pb-3">
              <h3 className="text-base font-bold text-[#2E3A87]">
                {editingShiftId ? 'Edit Plant Shift' : 'Add New Plant Shift'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {formErrors.general && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[4px]">
                {formErrors.general}
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Plant Site <span className="text-[#D93025]">*</span>
                  </label>
                  <select
                    value={formData.site_id}
                    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                  {formErrors.site_id && <p className="text-[#D93025] text-[11px] mt-0.5">{formErrors.site_id}</p>}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Shift Name <span className="text-[#D93025]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Day Shift A"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                  />
                  {formErrors.name && <p className="text-[#D93025] text-[11px] mt-0.5">{formErrors.name}</p>}
                </div>
              </div>

              <TimeRangePicker
                startTime={formData.start_time}
                endTime={formData.end_time}
                breakMinutes={formData.break_minutes}
                onStartTimeChange={(val) => setFormData({ ...formData, start_time: val })}
                onEndTimeChange={(val) => setFormData({ ...formData, end_time: val })}
                onBreakMinutesChange={(val) => setFormData({ ...formData, break_minutes: val })}
              />

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Working Days</label>
                <div className="flex items-center space-x-2">
                  {dayNames.map((d, i) => {
                    const isChecked = formData.working_days.includes(i);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDayToggle(i)}
                        className={`flex-1 py-1.5 text-center text-xs font-bold rounded-[4px] border transition-colors ${
                          isChecked
                            ? 'bg-[#2E3A87] text-white border-[#2E3A87]'
                            : 'bg-white text-slate-600 border-[#E0E3E8] hover:bg-slate-50'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E0E3E8]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E0E3E8] text-slate-600 hover:bg-slate-100 rounded-[4px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#2E3A87] hover:bg-[#232d69] text-white font-bold rounded-[4px]"
                >
                  {submitting ? 'Saving...' : editingShiftId ? 'Update Shift' : 'Save Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
