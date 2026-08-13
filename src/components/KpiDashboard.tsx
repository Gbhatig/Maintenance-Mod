'use client';

import React from 'react';
import { Activity, Clock, Wrench, ShieldCheck, AlertOctagon, TrendingUp } from 'lucide-react';

interface KpiData {
  availabilityPercent: number;
  mtbfHours: number;
  mttrHours: number;
  pmCompliancePercent: number;
  totalMachines: number;
  totalFailures: number;
  totalUnplannedDowntimeHours: number;
}

interface BadActor {
  machineId: string;
  code: string;
  name: string;
  sectionCode: string;
  criticality: string;
  failureCount: number;
  totalDowntimeHours: number;
  primaryFaultNature: string;
}

interface Machine {
  id: string;
  code: string;
  name: string;
  criticality: string;
  liveStatus: string;
}

interface KpiDashboardProps {
  kpi: KpiData | null;
  badActors: BadActor[];
  machines: Machine[];
  onAddDowntimeClick: () => void;
}

export default function KpiDashboard({ kpi, badActors, machines, onAddDowntimeClick }: KpiDashboardProps) {
  const runningCount = machines.filter((m) => m.liveStatus === 'RUNNING').length;
  const downCount = machines.filter((m) => m.liveStatus === 'DOWN').length;

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Availability % Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Availability %</span>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-100">{kpi?.availabilityPercent ?? 96.4}%</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Target: 95%
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpi?.availabilityPercent || 96)}%` }}
            />
          </div>
        </div>

        {/* MTBF (Hours) Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">MTBF (Hours)</span>
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-100">{kpi?.mtbfHours ?? 142.5}</span>
            <span className="text-xs text-slate-400 font-normal">hrs between failures</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">Mean Time Between Failures across 30 days</p>
        </div>

        {/* MTTR (Hours) Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">MTTR (Hours)</span>
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-100">{kpi?.mttrHours ?? 1.8}</span>
            <span className="text-xs text-slate-400 font-normal">hrs average repair</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">Mean Time To Repair breakdown events</p>
        </div>

        {/* PM Compliance % Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PM Compliance %</span>
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-100">{kpi?.pmCompliancePercent ?? 94.0}%</span>
            <span className="text-xs text-purple-400 font-semibold">On-time PMs</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpi?.pmCompliancePercent || 94)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Live Plant Status Summary & Top 10 Bad Actors Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Machine Fleet Summary */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100">Live Plant Asset Fleet</h3>
              <button
                onClick={onAddDowntimeClick}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center space-x-1"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>Log Breakdown</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 my-6">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-xs text-slate-400 font-semibold block">RUNNING</span>
                <span className="text-2xl font-black text-emerald-400">{runningCount}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Active Production</span>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-xs text-slate-400 font-semibold block">DOWN</span>
                <span className="text-2xl font-black text-rose-400">{downCount}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Breakdown Stoppage</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800/80">
            {machines.slice(0, 6).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-xs py-1">
                <span className="font-semibold text-slate-200">{m.code}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    m.liveStatus === 'RUNNING'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {m.liveStatus}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 Bad Actors Table */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Top 10 Bad Actors (Breakdown Analysis)</h3>
                <p className="text-xs text-slate-400">Ranked by total downtime hours and failure frequency</p>
              </div>
              <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-lg">
                High Maintenance Assets
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Machine Code</th>
                    <th className="py-2.5 px-3">Criticality</th>
                    <th className="py-2.5 px-3 text-center">Failures</th>
                    <th className="py-2.5 px-3 text-right">Downtime (Hrs)</th>
                    <th className="py-2.5 px-3">Primary Fault Nature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {badActors.map((ba, idx) => (
                    <tr key={ba.machineId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-100">{ba.code}</span>
                        <span className="text-[11px] text-slate-400 block">{ba.name}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            ba.criticality === 'A'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : ba.criticality === 'B'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          Class-{ba.criticality}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-200">{ba.failureCount}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-rose-400">{ba.totalDowntimeHours} hrs</td>
                      <td className="py-3 px-3 text-slate-300 italic">{ba.primaryFaultNature}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
