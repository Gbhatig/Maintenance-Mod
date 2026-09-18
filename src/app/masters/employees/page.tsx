'use client';

import React, { useState, useEffect } from 'react';
import DataGrid, { Column } from '@/components/DataGrid';
import ChipMultiSelect from '@/components/ChipMultiSelect';
import { Users, Plus, Upload, RefreshCw, Mail, Phone, Building2 } from 'lucide-react';

interface Employee {
  id: string;
  emp_code: string;
  name: string;
  mobile?: string;
  email?: string;
  department: { id: string; name: string };
  role: { id: string; name: string };
  status: string;
  sites?: Array<{ id: string; name: string }>;
  warehouses?: Array<{ id: string; name: string }>;
}

export default function EmployeesMasterPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  // Lookup Masters
  const [departments, setDepartments] = useState<any[]>([]);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [allSites, setAllSites] = useState<any[]>([]);
  const [allWarehouses, setAllWarehouses] = useState<any[]>([]);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    department_id: '',
    role_id: '',
    site_ids: [] as string[],
    warehouse_ids: [] as string[],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Bulk Import Modal State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkJobResult, setBulkJobResult] = useState<any | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/employees?page=${page}&page_size=${pageSize}`);
      const result = await res.json();
      if (res.ok) {
        setEmployees(result.data || []);
        setTotalRecords(result.meta?.total || 0);
      }
    } catch (err) {
      console.error('Fetch employees error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [deptRes, roleRes, siteRes, whRes] = await Promise.all([
        fetch('/api/v1/departments'),
        fetch('/api/v1/roles'),
        fetch('/api/v1/sites'),
        fetch('/api/v1/warehouses'),
      ]);

      if (deptRes.ok) setDepartments((await deptRes.json()).data || []);
      if (roleRes.ok) setAllRoles((await roleRes.json()).data || []);
      if (siteRes.ok) setAllSites((await siteRes.json()).data || []);
      if (whRes.ok) setAllWarehouses((await whRes.json()).data || []);
    } catch (err) {
      console.error('Fetch lookups error:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchLookups();
  }, [page]);

  // Section 7.5 Rule: Role options filtered by selected Department
  const filteredRoles = allRoles.filter((r) => !formData.department_id || r.departmentId === formData.department_id);

  // Section 7.5 Rule: Warehouse options filtered by selected Sites
  const filteredWarehouses = allWarehouses.filter(
    (w) => formData.site_ids.length === 0 || formData.site_ids.includes(w.siteId)
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/employees', {
        method: 'POST',
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
      setFormData({
        name: '',
        mobile: '',
        email: '',
        department_id: '',
        role_id: '',
        site_ids: [],
        warehouse_ids: [],
      });
      fetchEmployees();
    } catch (err: any) {
      setFormErrors({ general: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/employees/bulk', { method: 'POST' });
      const result = await res.json();
      setBulkJobResult(result);
    } catch (err: any) {
      console.error('Bulk upload error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Employee>[] = [
    { key: 'emp_code', header: 'Emp Code', render: (r) => <span className="font-bold text-[#2E3A87]">{r.emp_code}</span> },
    { key: 'name', header: 'Employee Name', render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
    {
      key: 'contact',
      header: 'Contact Info',
      render: (r) => (
        <div className="text-[11px] space-y-0.5">
          {r.mobile && (
            <div className="flex items-center space-x-1 text-slate-700">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{r.mobile}</span>
            </div>
          )}
          {r.email && (
            <div className="flex items-center space-x-1 text-slate-700">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{r.email}</span>
            </div>
          )}
        </div>
      ),
    },
    { key: 'dept', header: 'Department', render: (r) => r.department?.name || 'N/A' },
    { key: 'role', header: 'Role', render: (r) => <span className="font-medium text-[#1E63C4]">{r.role?.name}</span> },
    {
      key: 'assigned_sites',
      header: 'Assigned Sites & Warehouses',
      render: (r) => (
        <div className="text-[11px] text-slate-600 space-y-0.5">
          <div>Sites: <strong className="text-slate-800">{r.sites?.map((s) => s.name).join(', ') || 'All'}</strong></div>
          <div>WH: <strong className="text-slate-800">{r.warehouses?.map((w) => w.name).join(', ') || 'All'}</strong></div>
        </div>
      ),
    },
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
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-[6px] border border-[#E0E3E8] shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-[6px] text-[#1E63C4]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2E3A87]">Employees Master Registry</h1>
            <p className="text-xs text-slate-500">Staff directory, department roles, site scopes, and warehouse assignments</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsBulkOpen(true)}
            className="px-3.5 py-2 border border-[#E0E3E8] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-[4px] flex items-center space-x-1.5 transition-colors"
          >
            <Upload className="w-4 h-4 text-[#1E63C4]" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#2E3A87] hover:bg-[#232d69] text-white text-xs font-bold rounded-[4px] shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ NEW EMPLOYEE</span>
          </button>
        </div>
      </div>

      {/* DataGrid */}
      <DataGrid
        columns={columns}
        data={employees}
        totalRecords={totalRecords}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Create Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-[#E0E3E8] rounded-[6px] w-full max-w-xl shadow-2xl p-6 space-y-4 my-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#E0E3E8] pb-3">
              <h3 className="text-base font-bold text-[#2E3A87]">Add New Employee</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {formErrors.general && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[4px]">
                {formErrors.general}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-[#D93025]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                />
                {formErrors.name && <p className="text-[#D93025] text-[11px] mt-0.5">{formErrors.name}</p>}
              </div>

              {/* Contact Rule: Either Mobile or Email required */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-slate-400 text-[10px]">(Mobile or Email req)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="+919812345678"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                  />
                  {formErrors.mobile && <p className="text-[#D93025] text-[11px] mt-0.5">{formErrors.mobile}</p>}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-slate-400 text-[10px]">(Mobile or Email req)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="ramesh@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                  />
                  {formErrors.email && <p className="text-[#D93025] text-[11px] mt-0.5">{formErrors.email}</p>}
                </div>
              </div>

              {/* Department & Role Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Department <span className="text-[#D93025]">*</span>
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value, role_id: '' })}
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.department_id && <p className="text-[#D93025] text-[11px] mt-0.5">{formErrors.department_id}</p>}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Role <span className="text-[#D93025]">*</span>
                  </label>
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                  >
                    <option value="">Select Role...</option>
                    {filteredRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.role_id && <p className="text-[#D93025] text-[11px] mt-0.5">{formErrors.role_id}</p>}
                </div>
              </div>

              {/* ChipMultiSelect for Assigned Sites */}
              <ChipMultiSelect
                label="Assigned Sites Scope"
                options={allSites.map((s) => ({ id: s.id, name: s.name, subtitle: `${s.code} — ${s.city}` }))}
                selectedIds={formData.site_ids}
                onChange={(ids) => setFormData({ ...formData, site_ids: ids, warehouse_ids: [] })}
                placeholder="Select sites..."
              />

              {/* ChipMultiSelect for Assigned Warehouses (Filtered by Sites) */}
              <ChipMultiSelect
                label="Assigned Warehouses Scope (Filtered by Selected Sites)"
                options={filteredWarehouses.map((w) => ({ id: w.id, name: w.name, subtitle: `Type: ${w.type}` }))}
                selectedIds={formData.warehouse_ids}
                onChange={(ids) => setFormData({ ...formData, warehouse_ids: ids })}
                placeholder="Select warehouses..."
              />

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
                  {submitting ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E0E3E8] rounded-[6px] w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0E3E8] pb-3">
              <h3 className="text-base font-bold text-[#2E3A87]">Bulk Import Employees (CSV)</h3>
              <button onClick={() => setIsBulkOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleBulkUpload} className="space-y-4 text-xs">
              <div className="p-6 border-2 border-dashed border-[#E0E3E8] rounded-[6px] text-center bg-[#F5F7FB]">
                <Upload className="w-8 h-8 mx-auto text-[#1E63C4] mb-2" />
                <p className="font-semibold text-slate-700">Drop employees.csv here or click to browse</p>
                <p className="text-[11px] text-slate-400 mt-1">Columns: name, mobile, email, dept_name, role_name</p>
                <input type="file" accept=".csv" className="hidden" id="bulk-file" />
              </div>

              {bulkJobResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[4px]">
                  <p className="font-bold">Job Enqueued: {bulkJobResult.job_id}</p>
                  <p className="text-[11px]">{bulkJobResult.message}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(false)}
                  className="px-4 py-2 border border-[#E0E3E8] text-slate-600 rounded-[4px]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#2E3A87] text-white font-bold rounded-[4px]"
                >
                  {submitting ? 'Uploading...' : 'Start Import Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
