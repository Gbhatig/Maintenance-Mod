'use client';

import React, { useState, useEffect } from 'react';
import { Factory, AlertTriangle, ClipboardList, CalendarCheck, RefreshCw, Plus, CheckCircle, ShieldAlert, Cpu } from 'lucide-react';
import KpiDashboard from '@/components/KpiDashboard';
import AddDowntimeModal from '@/components/AddDowntimeModal';
import WorkOrderDetailDrawer from '@/components/WorkOrderDetailDrawer';

export default function MaintenanceAppPage() {
  const siteId = 'PUNE-PLANT-01';

  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'DOWNTIMES' | 'WORK_ORDERS' | 'PM'>('ANALYTICS');

  const [kpiData, setKpiData] = useState<any>(null);
  const [badActors, setBadActors] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [downtimes, setDowntimes] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [masters, setMasters] = useState<any>({
    departments: [],
    faultNatures: [],
    sections: [],
    shifts: [],
    employees: [],
  });
  const [parts, setParts] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  // Modal & Drawer State
  const [isAddDowntimeOpen, setIsAddDowntimeOpen] = useState(false);
  const [selectedWo, setSelectedWo] = useState<any | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [kpiRes, badRes, macRes, dtRes, woRes, masterRes] = await Promise.all([
        fetch(`/api/v1/sites/${siteId}/maintenance/analytics/kpis`),
        fetch(`/api/v1/sites/${siteId}/maintenance/analytics/bad-actors`),
        fetch(`/api/v1/sites/${siteId}/maintenance/machines`),
        fetch(`/api/v1/sites/${siteId}/maintenance/downtimes`),
        fetch(`/api/v1/sites/${siteId}/maintenance/work-orders`),
        fetch(`/api/v1/sites/${siteId}/maintenance/downtime-masters`),
      ]);

      if (kpiRes.ok) setKpiData(await kpiRes.json());
      if (badRes.ok) setBadActors(await badRes.json());
      if (macRes.ok) setMachines(await macRes.json());
      if (dtRes.ok) setDowntimes(await dtRes.json());
      if (woRes.ok) setWorkOrders(await woRes.json());
      if (masterRes.ok) {
        const mData = await masterRes.json();
        setMasters({
          departments: mData.departments || [],
          faultNatures: mData.faultNatures || [],
          sections: mData.sections || [],
          shifts: mData.shifts || [],
          employees: mData.employees || [],
        });
      }
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCloseDowntime = async (dtId: string) => {
    try {
      await fetch(`/api/v1/sites/${siteId}/maintenance/downtimes/${dtId}/close`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      fetchAllData();
    } catch (err) {
      console.error('Failed to close downtime:', err);
    }
  };

  const handleConvertToWo = async (dtId: string) => {
    try {
      await fetch(`/api/v1/sites/${siteId}/maintenance/downtimes/${dtId}/convert-to-wo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      fetchAllData();
      setActiveTab('WORK_ORDERS');
    } catch (err) {
      console.error('Failed to convert downtime:', err);
    }
  };

  const handleRunPmScheduler = async () => {
    try {
      await fetch(`/api/v1/sites/${siteId}/maintenance/pm/scheduler/run`, {
        method: 'POST',
      });
      fetchAllData();
      setActiveTab('WORK_ORDERS');
    } catch (err) {
      console.error('Failed to run PM scheduler:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">Discrete ERP — Maintenance Module</h1>
                <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-extrabold rounded-md">
                  PUNE-PLANT-01
                </span>
              </div>
              <p className="text-xs text-slate-400">Cloud Multi-Tenant Manufacturing Stoppage & Asset Care Engine</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex items-center space-x-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Sync</span>
            </button>

            <button
              onClick={() => setIsAddDowntimeOpen(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Log Breakdown</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-6 overflow-x-auto text-xs font-bold border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`py-3 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'ANALYTICS' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Factory className="w-4 h-4" />
            <span>KPI & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('DOWNTIMES')}
            className={`py-3 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'DOWNTIMES' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Breakdown Events ({downtimes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('WORK_ORDERS')}
            className={`py-3 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'WORK_ORDERS' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Work Orders ({workOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PM')}
            className={`py-3 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'PM' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>PM Scheduler</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Tab 1: KPI & Analytics */}
        {activeTab === 'ANALYTICS' && (
          <KpiDashboard
            kpi={kpiData}
            badActors={badActors}
            machines={machines}
            onAddDowntimeClick={() => setIsAddDowntimeOpen(true)}
          />
        )}

        {/* Tab 2: Downtime Events Log */}
        {activeTab === 'DOWNTIMES' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Downtime Breakdown Events Log</h3>
                <p className="text-xs text-slate-400">Live operational stoppages and historical breakdown records</p>
              </div>
              <button
                onClick={() => setIsAddDowntimeOpen(true)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Downtime Event</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Event #</th>
                    <th className="py-3 px-4">Target Machine(s)</th>
                    <th className="py-3 px-4">4M Fault Type</th>
                    <th className="py-3 px-4">Fault Nature</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Status / Duration</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {downtimes.map((dt) => {
                    const isOpen = !dt.endTime;
                    const machineNames = dt.machines.map((m: any) => m.machine.code).join(', ') || 'N/A';
                    return (
                      <tr key={dt.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-100">{dt.eventNumber}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-blue-400 flex items-center space-x-1">
                            <Cpu className="w-3.5 h-3.5 text-blue-400 inline" />
                            <span>{machineNames}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-bold text-[10px] rounded">
                            {dt.typeOfFault}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-200">{dt.faultNature?.name}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              dt.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : dt.severity === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {dt.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {isOpen ? (
                            <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold rounded-full animate-pulse">
                              ● ACTIVE DOWN
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">
                              Closed ({dt.durationMinutes} mins)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {isOpen && (
                            <button
                              onClick={() => handleCloseDowntime(dt.id)}
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] rounded-lg transition-colors"
                            >
                              Close Stoppage
                            </button>
                          )}
                          <button
                            onClick={() => handleConvertToWo(dt.id)}
                            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold text-[11px] rounded-lg transition-colors"
                          >
                            Convert to WO
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Work Order Management */}
        {activeTab === 'WORK_ORDERS' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Work Order Lifecycle Registry</h3>
                <p className="text-xs text-slate-400">Manage maintenance jobs, threshold approvals, and spare parts</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">WO Number</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Approval Threshold</th>
                    <th className="py-3 px-4 text-right">Est. Hours / Cost</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {workOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-100">{wo.woNumber}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            wo.woType === 'BREAKDOWN'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {wo.woType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-amber-400">{wo.priority}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-slate-800 text-slate-200 text-[10px] font-extrabold rounded-full">
                          {wo.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {wo.requiresSupervisorApproval ? (
                          <span className="inline-flex items-center space-x-1 text-amber-400 font-bold text-[11px]">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Needs Approval</span>
                          </span>
                        ) : wo.approvedBy ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approved</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Standard</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-300">
                        {wo.estimatedHours}h / ${wo.estimatedPartsCost}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedWo(wo)}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold text-xs rounded-lg transition-colors"
                        >
                          Open Drawer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: PM Scheduler */}
        {activeTab === 'PM' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Idempotent Preventive Maintenance Scheduler</h3>
                <p className="text-xs text-slate-400">Generate recurring calendar & usage PM work orders without duplicates</p>
              </div>
              <button
                onClick={handleRunPmScheduler}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Run Idempotent PM Engine</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
              <p className="font-semibold text-slate-200">PM Cycle Unique Constraint Logic:</p>
              <p className="text-slate-400">
                The PM Scheduler enforces a unique constraint on <code className="text-blue-400">(siteId, pmTemplateId, scheduledDueDate)</code> to guarantee that repeated runs on the same day create zero duplicate Work Orders.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Add Downtime Breakdown Modal */}
      <AddDowntimeModal
        isOpen={isAddDowntimeOpen}
        onClose={() => setIsAddDowntimeOpen(false)}
        machines={machines}
        departments={masters.departments}
        faultNatures={masters.faultNatures}
        employees={masters.employees}
        siteId={siteId}
        onDowntimeAdded={fetchAllData}
      />

      {/* Work Order Detail Drawer */}
      <WorkOrderDetailDrawer
        isOpen={!!selectedWo}
        onClose={() => setSelectedWo(null)}
        workOrder={selectedWo}
        siteId={siteId}
        parts={parts}
        onWorkOrderUpdated={() => {
          fetchAllData();
        }}
      />
    </div>
  );
}
