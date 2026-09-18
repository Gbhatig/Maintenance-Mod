'use client';

import './globals.css';
import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Users, Clock, Cpu, UserCheck, Shield, Trash2, AlertTriangle } from 'lucide-react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [formatting, setFormatting] = useState(false);

  const handleFormatDatabase = async () => {
    setFormatting(true);
    try {
      const res = await fetch('/api/v1/system/format', { method: 'POST' });
      if (res.ok) {
        setIsFormatModalOpen(false);
        window.location.reload();
      }
    } catch (err) {
      console.error('Format database error:', err);
    } finally {
      setFormatting(false);
    }
  };

  return (
    <html lang="en">
      <body className="bg-[#F5F7FB] text-slate-800 antialiased min-h-screen flex flex-col font-sans">
        {/* TOP BRAND NAV BAR (#2E3A87) */}
        <header className="bg-[#2E3A87] text-white shadow-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-white/10 rounded-[4px]">
                <Building2 className="w-5 h-5 text-blue-300" />
              </div>
              <span className="font-extrabold text-sm tracking-wide">
                MANUFACTURING <span className="text-blue-300 font-normal">ERP v2.0</span>
              </span>
            </div>

            {/* Actions & Format Data Button */}
            <div className="flex items-center space-x-3 text-xs">
              <button
                onClick={() => setIsFormatModalOpen(true)}
                className="px-3 py-1 bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white border border-red-400/40 rounded-[4px] font-semibold flex items-center space-x-1.5 transition-colors"
                title="Wipe and format database"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Format Data</span>
              </button>

              <div className="flex items-center space-x-2 bg-blue-900/50 px-2.5 py-1 rounded-[4px]">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">Saurav Khari</span>
                <span className="text-[10px] bg-blue-400/30 px-1.5 py-0.5 rounded text-blue-200">SUPER_ADMIN</span>
              </div>
            </div>
          </div>

          {/* SECONDARY MASTERS NAV BAR */}
          <nav className="bg-[#232d69] border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 flex items-center space-x-1 overflow-x-auto text-xs font-semibold">
              <Link
                href="/masters/sites"
                className="px-4 py-2.5 text-white hover:bg-white/10 flex items-center space-x-2 border-b-2 border-transparent hover:border-[#1E63C4] transition-colors"
              >
                <Building2 className="w-4 h-4 text-blue-300" />
                <span>Sites & Warehouses</span>
              </Link>

              <Link
                href="/masters/employees"
                className="px-4 py-2.5 text-white hover:bg-white/10 flex items-center space-x-2 border-b-2 border-transparent hover:border-[#1E63C4] transition-colors"
              >
                <Users className="w-4 h-4 text-blue-300" />
                <span>Employees Registry</span>
              </Link>

              <Link
                href="/masters/shifts"
                className="px-4 py-2.5 text-white hover:bg-white/10 flex items-center space-x-2 border-b-2 border-transparent hover:border-[#1E63C4] transition-colors"
              >
                <Clock className="w-4 h-4 text-blue-300" />
                <span>Plant Shifts</span>
              </Link>

              <Link
                href="/masters/machines"
                className="px-4 py-2.5 text-white hover:bg-white/10 flex items-center space-x-2 border-b-2 border-transparent hover:border-[#1E63C4] transition-colors"
              >
                <Cpu className="w-4 h-4 text-blue-300" />
                <span>Machines & Parameters</span>
              </Link>

              <div className="ml-auto flex items-center space-x-2 text-slate-400 text-[11px] py-2 px-3 border-l border-white/10">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Phase 2 Stubs: Orders · Inventory · Quality · Maintenance</span>
              </div>
            </div>
          </nav>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1">{children}</main>

        {/* FORMAT DATABASE CONFIRMATION MODAL */}
        {isFormatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white border border-[#E0E3E8] rounded-[6px] w-full max-w-md shadow-2xl p-6 space-y-4">
              <div className="flex items-center space-x-3 text-red-600">
                <AlertTriangle className="w-6 h-6 shrink-0 text-[#D93025]" />
                <h3 className="text-base font-bold text-slate-900">Format All ERP Data?</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                This action will permanently delete all records across Sites, Warehouses, Employees, Shifts, Machines, and Audit Logs.
              </p>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E0E3E8]">
                <button
                  type="button"
                  onClick={() => setIsFormatModalOpen(false)}
                  className="px-4 py-2 border border-[#E0E3E8] text-slate-600 rounded-[4px] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFormatDatabase}
                  disabled={formatting}
                  className="px-5 py-2 bg-[#D93025] hover:bg-red-700 text-white font-bold rounded-[4px] text-xs"
                >
                  {formatting ? 'Formatting...' : 'Yes, Format Database'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="bg-white border-t border-[#E0E3E8] py-3 text-center text-xs text-slate-400">
          Manufacturing Module Masters Foundation v2.0 • Full Editability & Formatting Enabled
        </footer>
      </body>
    </html>
  );
}
