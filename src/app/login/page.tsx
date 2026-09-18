'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ShieldCheck, KeyRound, Smartphone, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'OFFICE' | 'SHOPFLOOR'>('OFFICE');

  // Office Login State
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  // Shopfloor OTP State
  const [mobile, setMobile] = useState('+919876543210');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOfficeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMsg(result.error?.message || 'Login failed');
        return;
      }

      sessionStorage.setItem('access_token', result.data.access_token);
      sessionStorage.setItem('user', JSON.stringify(result.data.user));

      router.push('/masters/sites');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile) return;
    setOtpSent(true);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === '123456' || otp.length === 6) {
      sessionStorage.setItem('access_token', 'mock_jwt_otp_token');
      router.push('/masters/machines');
    } else {
      setErrorMsg('Invalid OTP code. Try 123456');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-[#2E3A87] text-white rounded-[8px] shadow-lg mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-[#2E3A87] tracking-tight">MANUFACTURING ERP</h1>
          <p className="text-xs text-slate-500 font-medium">Masters Foundation v2.0 Enterprise Portal</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white border border-[#E0E3E8] rounded-[8px] shadow-xl p-6 space-y-6">
          {/* Tab Switcher */}
          <div className="flex border-b border-[#E0E3E8]">
            <button
              onClick={() => {
                setTab('OFFICE');
                setErrorMsg('');
              }}
              className={`flex-1 pb-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-2 transition-colors ${
                tab === 'OFFICE' ? 'border-[#1E63C4] text-[#1E63C4]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Office Staff Login</span>
            </button>

            <button
              onClick={() => {
                setTab('SHOPFLOOR');
                setErrorMsg('');
              }}
              className={`flex-1 pb-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-2 transition-colors ${
                tab === 'SHOPFLOOR' ? 'border-[#1E63C4] text-[#1E63C4]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Shop-Floor OTP</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[4px]">
              {errorMsg}
            </div>
          )}

          {/* OFFICE LOGIN FORM */}
          {tab === 'OFFICE' && (
            <form onSubmit={handleOfficeLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username / Emp Code</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#2E3A87] hover:bg-[#232d69] text-white font-bold rounded-[4px] shadow-sm flex items-center justify-center space-x-1 transition-colors"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* SHOPFLOOR OTP FORM */}
          {tab === 'SHOPFLOOR' && (
            <div className="space-y-4 text-xs">
              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Registered Operator Mobile</label>
                    <input
                      type="text"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#2E3A87] hover:bg-[#232d69] text-white font-bold rounded-[4px]"
                  >
                    Send 6-Digit OTP SMS
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-2.5 bg-blue-50 text-[#1E63C4] border border-blue-200 rounded-[4px] text-[11px]">
                    OTP sent to {mobile}. Enter <strong>123456</strong> to verify.
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">6-Digit OTP Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] text-center font-mono font-bold tracking-widest text-base focus:outline-none focus:border-[#1E63C4]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-[4px]"
                  >
                    Verify & Access Shop-Floor
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>OWASP-aligned TLS 1.2+ Encrypted & Site Scope Isolated</span>
        </div>
      </div>
    </div>
  );
}
