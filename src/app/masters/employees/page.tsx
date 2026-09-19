'use client';

import React, { useState, useEffect } from 'react';
import DataGrid, { Column } from '@/components/DataGrid';
import ChipMultiSelect from '@/components/ChipMultiSelect';
import {
  Users,
  Plus,
  Upload,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
} from 'lucide-react';

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

interface LeaveRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  emp_code?: string;
  department_name?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status: string;
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

  // Add / Edit Employee Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    department_id: '',
    role_id: '',
    site_ids: [] as string[],
    warehouse_ids: [] as string[],
    status: 'ACTIVE',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Bulk Import Modal State
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // LEAVE MANAGEMENT MODAL STATE (Individual Employee)
  const [selectedLeaveEmp, setSelectedLeaveEmp] = useState<Employee | null>(null);
  const [empLeaves, setEmpLeaves] = useState<LeaveRecord[]>([]);
  const [leaveSummary, setLeaveSummary] = useState<any>(null);
  const [loadingLeaves, setLoadingLeaves] = useState(false);

  // Apply Leave Form
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // ALL LEAVES APPROVAL MODAL STATE (Company-wide)
  const [isAllLeavesOpen, setIsAllLeavesOpen] = useState(false);
  const [allLeavesList, setAllLeavesList] = useState<LeaveRecord[]>([]);
  const [loadingAllLeaves, setLoadingAllLeaves] = useState(false);

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

  const handleOpenCreate = () => {
    setEditingEmpId(null);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      department_id: '',
      role_id: '',
      site_ids: [],
      warehouse_ids: [],
      status: 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setFormData({
      name: emp.name,
      mobile: emp.mobile || '',
      email: emp.email || '',
      department_id: emp.department?.id || '',
      role_id: emp.role?.id || '',
      site_ids: emp.sites?.map((s) => s.id) || [],
      warehouse_ids: emp.warehouses?.map((w) => w.id) || [],
      status: emp.status || 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      const isEdit = !!editingEmpId;
      const url = isEdit ? `/api/v1/employees/${editingEmpId}` : '/api/v1/employees';
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
      fetchEmployees();
    } catch (err: any) {
      setFormErrors({ general: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Are you sure you want to delete employee "${emp.name}"?`)) return;
    try {
      await fetch(`/api/v1/employees/${emp.id}`, { method: 'DELETE' });
      fetchEmployees();
    } catch (err) {
      console.error('Delete employee error:', err);
    }
  };

  // LEAVE MANAGEMENT HANDLERS
  const handleOpenManageLeaves = async (emp: Employee) => {
    setSelectedLeaveEmp(emp);
    setLoadingLeaves(true);
    try {
      const res = await fetch(`/api/v1/employees/${emp.id}/leaves`);
      if (res.ok) {
        const data = await res.json();
        setEmpLeaves(data.leaves || []);
        setLeaveSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Fetch employee leaves error:', err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveEmp) return;
    setSubmittingLeave(true);

    try {
      const res = await fetch('/api/v1/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedLeaveEmp.id,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason: leaveReason,
        }),
      });

      if (res.ok) {
        setLeaveReason('');
        handleOpenManageLeaves(selectedLeaveEmp);
      } else {
        const result = await res.json();
        alert(result.error?.message || 'Failed to submit leave application');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleOpenAllLeaves = async () => {
    setIsAllLeavesOpen(true);
    setLoadingAllLeaves(true);
    try {
      const res = await fetch('/api/v1/leaves');
      if (res.ok) {
        const data = await res.json();
        setAllLeavesList(data.data || []);
      }
    } catch (err) {
      console.error('Fetch all leaves error:', err);
    } finally {
      setLoadingAllLeaves(false);
    }
  };

  const handleUpdateLeaveStatus = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/v1/leaves/${leaveId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approved_by: 'Saurav Khari' }),
      });

      if (res.ok) {
        if (selectedLeaveEmp) handleOpenManageLeaves(selectedLeaveEmp);
        if (isAllLeavesOpen) handleOpenAllLeaves();
      }
    } catch (err) {
      console.error('Update leave status error:', err);
    }
  };

  const filteredRoles = allRoles.filter((r) => !formData.department_id || r.departmentId === formData.department_id);
  const filteredWarehouses = allWarehouses.filter(
    (w) => formData.site_ids.length === 0 || formData.site_ids.includes(w.siteId)
  );

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
      key: 'leaves',
      header: 'Employee Leaves',
      render: (r) => (
        <button
          onClick={() => handleOpenManageLeaves(r)}
          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-[4px] text-[11px] font-semibold flex items-center space-x-1 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-amber-600" />
          <span>Manage Leaves</span>
        </button>
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
            <p className="text-xs text-slate-500">Staff directory, department roles, site scopes, and leave management</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenAllLeaves}
            className="px-3 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-[4px] flex items-center space-x-1.5 transition-colors"
          >
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>Leave Applications & Approvals</span>
          </button>

          <button
            onClick={handleOpenCreate}
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
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* INDIVIDUAL EMPLOYEE LEAVE MANAGEMENT MODAL */}
      {selectedLeaveEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-[#E0E3E8] rounded-[6px] w-full max-w-2xl shadow-2xl p-6 space-y-5 my-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#E0E3E8] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#2E3A87]">
                  Leave Management: {selectedLeaveEmp.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Emp Code: <span className="font-semibold text-slate-800">{selectedLeaveEmp.emp_code}</span> | Dept:{' '}
                  <span className="font-semibold text-slate-800">{selectedLeaveEmp.department?.name}</span>
                </p>
              </div>
              <button onClick={() => setSelectedLeaveEmp(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {/* Leave Balance Summary */}
            {leaveSummary && (
              <div className="grid grid-cols-4 gap-3 bg-[#F5F7FB] p-3 rounded-[6px] border border-[#E0E3E8] text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Casual Allowance</span>
                  <span className="font-bold text-slate-800">{leaveSummary.casual_allowance} Days</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sick Allowance</span>
                  <span className="font-bold text-slate-800">{leaveSummary.sick_allowance} Days</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Approved Leaves</span>
                  <span className="font-bold text-emerald-600">{leaveSummary.approved_days} Days</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Pending Approval</span>
                  <span className="font-bold text-amber-600">{leaveSummary.pending_days} Days</span>
                </div>
              </div>
            )}

            {/* Apply Leave Form */}
            <form onSubmit={handleApplyLeave} className="p-4 bg-blue-50/50 border border-blue-200 rounded-[6px] space-y-3 text-xs">
              <div className="flex items-center space-x-2 font-bold text-[#2E3A87]">
                <FileText className="w-4 h-4 text-[#1E63C4]" />
                <span>Submit New Leave Application</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E0E3E8] rounded-[4px] font-semibold text-slate-800"
                  >
                    <option value="CASUAL">Casual Leave</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="EARNED">Earned Leave</option>
                    <option value="UNPAID">Unpaid Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E0E3E8] rounded-[4px] font-semibold text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E0E3E8] rounded-[4px] font-semibold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Leave</label>
                <input
                  type="text"
                  placeholder="e.g. Medical emergency or personal leave..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#E0E3E8] rounded-[4px] text-slate-800"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-4 py-1.5 bg-[#2E3A87] hover:bg-[#232d69] text-white font-bold rounded-[4px]"
                >
                  {submittingLeave ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>

            {/* Leave History List */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[#2E3A87]">Leave Records & Status History</h4>
              {loadingLeaves ? (
                <p className="text-center py-4 text-slate-400 italic">Loading leaves...</p>
              ) : empLeaves.length === 0 ? (
                <p className="text-center py-4 text-slate-400 italic border border-dashed rounded-[4px]">No leave applications filed yet.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {empLeaves.map((l) => (
                    <div
                      key={l.id}
                      className="p-3 bg-white border border-[#E0E3E8] rounded-[4px] flex items-center justify-between shadow-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#2E3A87]">{l.leave_type} LEAVE</span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {l.start_date} to {l.end_date} ({l.total_days} days)
                          </span>
                        </div>
                        {l.reason && <p className="text-slate-600 text-[11px] italic">&quot;{l.reason}&quot;</p>}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold ${
                            l.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {l.status}
                        </span>

                        {l.status === 'PENDING' && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleUpdateLeaveStatus(l.id, 'APPROVED')}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Approve Leave"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateLeaveStatus(l.id, 'REJECTED')}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Reject Leave"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E0E3E8]">
              <button
                onClick={() => setSelectedLeaveEmp(null)}
                className="px-4 py-1.5 border border-[#E0E3E8] text-slate-600 rounded-[4px] text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALL COMPANY LEAVES APPROVAL MODAL */}
      {isAllLeavesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-[#E0E3E8] rounded-[6px] w-full max-w-3xl shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E0E3E8] pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-[#2E3A87]">Company Leave Applications & Approvals</h3>
              </div>
              <button onClick={() => setIsAllLeavesOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {loadingAllLeaves ? (
              <p className="text-center py-8 text-slate-400 italic">Loading leave applications...</p>
            ) : allLeavesList.length === 0 ? (
              <p className="text-center py-8 text-slate-400 italic border border-dashed rounded-[4px]">No leave applications logged in the system.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1 text-xs">
                {allLeavesList.map((l) => (
                  <div
                    key={l.id}
                    className="p-3.5 bg-white border border-[#E0E3E8] rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 text-sm">{l.employee_name}</span>
                        <span className="font-mono text-[#2E3A87] text-[11px]">({l.emp_code})</span>
                        <span className="text-slate-400">• {l.department_name}</span>
                      </div>

                      <div className="flex items-center space-x-2 font-semibold text-slate-700">
                        <span className="px-2 py-0.5 bg-blue-50 text-[#1E63C4] rounded text-[11px] font-bold">{l.leave_type}</span>
                        <span>{l.start_date} to {l.end_date}</span>
                        <span className="text-slate-400">({l.total_days} days)</span>
                      </div>

                      {l.reason && <p className="text-slate-500 italic text-[11px]">&quot;{l.reason}&quot;</p>}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold ${
                          l.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {l.status}
                      </span>

                      {l.status === 'PENDING' && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleUpdateLeaveStatus(l.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center space-x-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleUpdateLeaveStatus(l.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[11px] flex items-center space-x-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#E0E3E8]">
              <button
                onClick={() => setIsAllLeavesOpen(false)}
                className="px-4 py-1.5 border border-[#E0E3E8] text-slate-600 rounded-[4px] text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-[#E0E3E8] rounded-[6px] w-full max-w-xl shadow-2xl p-6 space-y-4 my-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#E0E3E8] pb-3">
              <h3 className="text-base font-bold text-[#2E3A87]">
                {editingEmpId ? 'Edit Employee Record' : 'Add New Employee'}
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

              <ChipMultiSelect
                label="Assigned Sites Scope"
                options={allSites.map((s) => ({ id: s.id, name: s.name, subtitle: `${s.code} — ${s.city}` }))}
                selectedIds={formData.site_ids}
                onChange={(ids) => setFormData({ ...formData, site_ids: ids, warehouse_ids: [] })}
                placeholder="Select sites..."
              />

              <ChipMultiSelect
                label="Assigned Warehouses Scope"
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
                  {submitting ? 'Saving...' : editingEmpId ? 'Update Employee' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
