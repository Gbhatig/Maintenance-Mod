'use client';

import React, { useState, useEffect } from 'react';
import DataGrid, { Column } from '@/components/DataGrid';
import { Plus, Building2, AlertTriangle, RefreshCw } from 'lucide-react';

interface Site {
  id: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  gst_no?: string;
  status: string;
  warehouses_count?: number;
  employees_count?: number;
  machines_count?: number;
}

export default function SitesMasterPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  // Form Modal State (Create or Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'IN',
    gst_no: '',
    status: 'ACTIVE',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete Error Alert
  const [deleteConflict, setDeleteConflict] = useState<any | null>(null);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/sites?page=${page}&page_size=${pageSize}`);
      const result = await res.json();
      if (res.ok) {
        setSites(result.data || []);
        setTotalRecords(result.meta?.total || 0);
      }
    } catch (err) {
      console.error('Fetch sites error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, [page]);

  const handleOpenCreate = () => {
    setEditingSiteId(null);
    setFormData({ code: '', name: '', address: '', city: '', state: '', country: 'IN', gst_no: '', status: 'ACTIVE' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (site: Site) => {
    setEditingSiteId(site.id);
    setFormData({
      code: site.code,
      name: site.name,
      address: site.address || '',
      city: site.city || '',
      state: site.state || '',
      country: site.country || 'IN',
      gst_no: site.gst_no || '',
      status: site.status || 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      const isEdit = !!editingSiteId;
      const url = isEdit ? `/api/v1/sites/${editingSiteId}` : '/api/v1/sites';
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
      fetchSites();
    } catch (err: any) {
      setFormErrors({ general: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (site: Site) => {
    setDeleteConflict(null);
    if (!confirm(`Are you sure you want to delete site "${site.name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/sites/${site.id}`, {
        method: 'DELETE',
      });

      if (res.status === 409) {
        const result = await res.json();
        setDeleteConflict({
          siteName: site.name,
          message: result.error?.message,
          dependents: result.error?.dependents,
        });
        return;
      }

      fetchSites();
    } catch (err) {
      console.error('Delete site error:', err);
    }
  };

  const columns: Column<Site>[] = [
    { key: 'code', header: 'Site Code', render: (r) => <span className="font-bold text-[#2E3A87]">{r.code}</span> },
    { key: 'name', header: 'Site Name', render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
    { key: 'city', header: 'City' },
    { key: 'state', header: 'State' },
    { key: 'country', header: 'Country', render: (r) => <span className="font-mono">{r.country}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${
            r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
          }`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: 'dependents',
      header: 'Assigned Assets',
      render: (r) => (
        <div className="text-[11px] text-slate-500 space-x-2">
          <span>Warehouses: <strong className="text-slate-800">{r.warehouses_count || 0}</strong></span>
          <span>Employees: <strong className="text-slate-800">{r.employees_count || 0}</strong></span>
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
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2E3A87]">Sites Master Registry</h1>
            <p className="text-xs text-slate-500">Manage plant sites, addresses, location codes, and site-level scopes</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSites}
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
            <span>+ NEW SITE</span>
          </button>
        </div>
      </div>

      {deleteConflict && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-[6px] text-red-800 text-xs flex items-start space-x-3 shadow-md">
          <AlertTriangle className="w-5 h-5 text-[#D93025] shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <h4 className="font-bold text-sm text-[#D93025]">Cannot Delete Site &quot;{deleteConflict.siteName}&quot; (409 Conflict)</h4>
            <p>{deleteConflict.message}</p>
          </div>
          <button onClick={() => setDeleteConflict(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
      )}

      {/* DataGrid */}
      <DataGrid
        columns={columns}
        data={sites}
        totalRecords={totalRecords}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Add / Edit Site Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E0E3E8] rounded-[6px] w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#E0E3E8] pb-3">
              <h3 className="text-base font-bold text-[#2E3A87]">
                {editingSiteId ? 'Edit Plant Site' : 'Add New Plant Site'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {formErrors.general && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[4px]">
                {formErrors.general}
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Site Name <span className="text-[#D93025]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Transmission Tower Plant"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                />
                {formErrors.name && <p className="text-[#D93025] text-[11px] mt-0.5">{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    City <span className="text-[#D93025]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Adampur"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                  />
                  {formErrors.city && <p className="text-[#D93025] text-[11px] mt-0.5">{formErrors.city}</p>}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    State <span className="text-[#D93025]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Punjab"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                  />
                  {formErrors.state && <p className="text-[#D93025] text-[11px] mt-0.5">{formErrors.state}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Country Code (ISO-3166)</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="IN"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] uppercase font-mono focus:outline-none focus:border-[#1E63C4]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST / Tax Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 03ABCDE1234F1Z5"
                    value={formData.gst_no}
                    onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                <textarea
                  rows={2}
                  placeholder="Street address or industrial area..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                />
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
                  {submitting ? 'Saving...' : editingSiteId ? 'Update Site' : 'Save Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
