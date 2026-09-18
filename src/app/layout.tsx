import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Building2, Users, Clock, Cpu, UserCheck, Shield, ChevronDown } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Manufacturing ERP — Masters Module v2.0',
  description: 'Enterprise Manufacturing ERP — Sites, Employees, Shifts, and Machines Masters',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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

            {/* Active Site Switcher & User Profile Badge */}
            <div className="flex items-center space-x-4 text-xs">
              <div className="hidden sm:flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-[4px] border border-white/20">
                <span className="text-slate-300 text-[11px]">Active Site:</span>
                <span className="font-bold text-white">STE-0001 Transmission Tower</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
              </div>

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

              {/* Stubs for Phase 2+ Navigation (Architectural Stubs Section 3.4) */}
              <div className="ml-auto flex items-center space-x-2 text-slate-400 text-[11px] py-2 px-3 border-l border-white/10">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Phase 2 Stubs: Orders · Inventory · Quality · Maintenance</span>
              </div>
            </div>
          </nav>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1">{children}</main>

        {/* FOOTER */}
        <footer className="bg-white border-t border-[#E0E3E8] py-3 text-center text-xs text-slate-400">
          Manufacturing Module Masters Foundation v2.0 • ISO-3166 & ISA-95 Compliant • Built September 2026
        </footer>
      </body>
    </html>
  );
}
