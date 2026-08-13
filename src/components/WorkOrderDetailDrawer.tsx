'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle, Clock, Wrench, PackagePlus, AlertCircle, UserCheck } from 'lucide-react';

interface WorkOrder {
  id: string;
  woNumber: string;
  woType: string;
  priority: string;
  status: string;
  estimatedHours: number;
  actualHours: number;
  estimatedPartsCost: number;
  actualPartsCost: number;
  requiresSupervisorApproval: boolean;
  approvedBy?: { firstName: string; lastName: string; employeeCode: string } | null;
  createdBy?: { firstName: string; lastName: string };
  downtimeEvent?: {
    eventNumber: string;
    machines: Array<{ machine: { code: string; name: string } }>;
  } | null;
  pmTemplate?: { title: string; machine: { code: string; name: string } } | null;
  partsConsumed?: Array<{
    id: string;
    quantityConsumed: number;
    totalCost: number;
    part: { partNumber: string; name: string; unitCost: number };
  }>;
}

interface Part {
  id: string;
  partNumber: string;
  name: string;
  unitCost: number;
  quantityOnHand: number;
}

interface WorkOrderDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  siteId: string;
  parts: Part[];
  onWorkOrderUpdated: () => void;
}

export default function WorkOrderDetailDrawer({
  isOpen,
  onClose,
  workOrder,
  siteId,
  parts,
  onWorkOrderUpdated,
}: WorkOrderDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Consume Part state
  const [selectedPartId, setSelectedPartId] = useState(parts[0]?.id || '');
  const [consumeQty, setConsumeQty] = useState(1);

  if (!isOpen || !workOrder) return null;

  const statusSteps = ['DRAFT', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];
  const currentStepIdx = statusSteps.indexOf(workOrder.status);

  const targetMachine =
    workOrder.downtimeEvent?.machines?.[0]?.machine ||
    workOrder.pmTemplate?.machine ||
    { code: 'N/A', name: 'General Plant Asset' };

  const handleTransition = async (nextStatus: string) => {
    setApprovalError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/sites/${siteId}/maintenance/work-orders/${workOrder.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.requiresSupervisorApproval) {
          setApprovalError(data.message || 'Supervisor Approval Required before starting work.');
          return;
        }
        throw new Error(data.error || 'Transition failed');
      }

      onWorkOrderUpdated();
    } catch (err: any) {
      setApprovalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setApprovalError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/sites/${siteId}/maintenance/work-orders/${workOrder.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Approval failed');
      }

      onWorkOrderUpdated();
    } catch (err: any) {
      setApprovalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConsumePart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/sites/${siteId}/maintenance/work-orders/${workOrder.id}/consume-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partId: selectedPartId || parts[0]?.id,
          quantityConsumed: Number(consumeQty),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to consume part');
      }

      onWorkOrderUpdated();
    } catch (err: any) {
      setApprovalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/60">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-xl font-bold text-slate-100">{workOrder.woNumber}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  workOrder.woType === 'BREAKDOWN'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}
              >
                {workOrder.woType}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Asset: <span className="font-semibold text-slate-200">{targetMachine.code}</span> — {targetMachine.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Lifecycle Stepper */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Work Order Lifecycle Stepper
            </h4>
            <div className="flex items-center justify-between relative">
              {statusSteps.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step} className="flex flex-col items-center z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-lg'
                          : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] font-semibold mt-1.5 ${
                        isCurrent ? 'text-blue-400' : isCompleted ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Supervisor Approval Required Banner */}
          {(workOrder.requiresSupervisorApproval || workOrder.estimatedHours > 8.0 || workOrder.estimatedPartsCost > 500.0) && (
            <div
              className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
                workOrder.approvedBy
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}
            >
              <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">
                    {workOrder.approvedBy ? 'Supervisor Approval Granted' : 'Supervisor Threshold Approval Required'}
                  </h4>
                  {workOrder.approvedBy ? (
                    <span className="inline-flex items-center space-x-1 text-xs text-emerald-400 font-semibold">
                      <UserCheck className="w-4 h-4" />
                      <span>Approved by {workOrder.approvedBy.firstName}</span>
                    </span>
                  ) : (
                    <button
                      onClick={handleApprove}
                      disabled={loading}
                      className="px-3.5 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 shadow-md transition-colors"
                    >
                      Approve as Supervisor
                    </button>
                  )}
                </div>
                <p className="text-xs opacity-90 mt-1">
                  Threshold Rule: Work orders exceeding 8 estimated hours ({workOrder.estimatedHours} hrs) or $500 total spare parts cost (${workOrder.estimatedPartsCost}) require Supervisor sign-off before entering IN_PROGRESS state.
                </p>
              </div>
            </div>
          )}

          {approvalError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{approvalError}</span>
            </div>
          )}

          {/* Estimates vs Actual Cost Card */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Est. vs Actual Hours</span>
              </div>
              <p className="text-lg font-bold text-slate-100">
                {workOrder.estimatedHours} hrs <span className="text-slate-500 text-xs font-normal">/ {workOrder.actualHours} hrs actual</span>
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold mb-1">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span>Parts Cost</span>
              </div>
              <p className="text-lg font-bold text-slate-100">
                ${workOrder.estimatedPartsCost} <span className="text-slate-500 text-xs font-normal">/ ${workOrder.actualPartsCost} actual</span>
              </p>
            </div>
          </div>

          {/* Spare Parts Consumption Log */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Consumed Spare Parts Log
            </h4>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              {workOrder.partsConsumed && workOrder.partsConsumed.length > 0 ? (
                <div className="space-y-2">
                  {workOrder.partsConsumed.map((pc) => (
                    <div
                      key={pc.id}
                      className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{pc.part.name}</span>
                        <span className="text-slate-500 ml-2">({pc.part.partNumber})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-200">Qty: {pc.quantityConsumed}</span>
                        <span className="text-slate-400 ml-3">${pc.totalCost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No spare parts consumed yet.</p>
              )}

              {/* Add Part Form */}
              <form onSubmit={handleConsumePart} className="pt-3 border-t border-slate-800 flex items-center space-x-2">
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                >
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.unitCost}) - Stock: {p.quantityOnHand}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={consumeQty}
                  onChange={(e) => setConsumeQty(Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2 py-2 text-center"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center space-x-1"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>Log Part</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Priority: <span className="font-bold text-amber-400">{workOrder.priority}</span>
          </div>

          <div className="flex items-center space-x-3">
            {currentStepIdx < statusSteps.length - 1 && (
              <button
                onClick={() => handleTransition(statusSteps[currentStepIdx + 1])}
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2"
              >
                <span>Move to {statusSteps[currentStepIdx + 1]}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
