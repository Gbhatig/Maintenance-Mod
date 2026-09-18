'use client';

import React from 'react';
import { Clock, AlertCircle, Moon } from 'lucide-react';

interface TimeRangePickerProps {
  startTime: string;
  endTime: string;
  breakMinutes: number;
  onStartTimeChange: (val: string) => void;
  onEndTimeChange: (val: string) => void;
  onBreakMinutesChange: (val: number) => void;
}

function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export default function TimeRangePicker({
  startTime,
  endTime,
  breakMinutes,
  onStartTimeChange,
  onEndTimeChange,
  onBreakMinutesChange,
}: TimeRangePickerProps) {
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);

  const isIdentical = startTime && endTime && startTime === endTime;

  let isOvernight = false;
  let grossMinutes = 0;

  if (startTime && endTime && !isIdentical) {
    if (endMins > startMins) {
      isOvernight = false;
      grossMinutes = endMins - startMins;
    } else {
      isOvernight = true;
      grossMinutes = 1440 - startMins + endMins;
    }
  }

  const bMins = Number(breakMinutes) || 0;
  const netMinutes = Math.max(0, grossMinutes - bMins);

  const grossHours = (grossMinutes / 60).toFixed(1);
  const netHours = (netMinutes / 60).toFixed(1);

  return (
    <div className="p-4 bg-[#F5F7FB] border border-[#E0E3E8] rounded-[6px] space-y-4">
      <div className="flex items-center space-x-2 text-xs font-semibold text-[#2E3A87]">
        <Clock className="w-4 h-4" />
        <span>Shift Time Calculator & Duration Engine</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Start Time *</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-[#E0E3E8] rounded-[4px] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E63C4]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">End Time *</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-[#E0E3E8] rounded-[4px] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E63C4]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Break Duration (Mins)</label>
          <input
            type="number"
            min="0"
            value={breakMinutes}
            onChange={(e) => onBreakMinutesChange(Number(e.target.value))}
            className="w-full px-3 py-1.5 bg-white border border-[#E0E3E8] rounded-[4px] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1E63C4]"
          />
        </div>
      </div>

      {isIdentical && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[4px] flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#D93025]" />
          <span>Start time and end time cannot be identical (§4.4 rule).</span>
        </div>
      )}

      {/* Computed Summary */}
      {startTime && endTime && !isIdentical && (
        <div className="flex flex-wrap items-center justify-between p-3 bg-white border border-[#E0E3E8] rounded-[4px] text-xs">
          <div className="flex items-center space-x-3">
            <div>
              <span className="text-slate-400 block text-[10px]">Gross Duration</span>
              <span className="font-bold text-slate-800">{grossHours} hrs ({grossMinutes} mins)</span>
            </div>

            <div className="border-l border-[#E0E3E8] pl-3">
              <span className="text-slate-400 block text-[10px]">Net Operating Duration</span>
              <span className="font-bold text-[#1E63C4]">{netHours} hrs ({netMinutes} mins)</span>
            </div>
          </div>

          <div>
            {isOvernight ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-purple-100 text-purple-700 font-bold rounded-[4px] text-[11px]">
                <Moon className="w-3.5 h-3.5" />
                <span>Overnight Shift</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-[4px] text-[11px]">
                <span>Day Shift</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
