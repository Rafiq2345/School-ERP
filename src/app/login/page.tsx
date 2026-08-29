'use client';

import React, { useState } from 'react';
import { School, Lock, User, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { SupportedLocale } from '@/lib/types';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';
import { getTranslation } from '@/lib/i18n/translations';

export default function LoginPage() {
  const [locale, setLocale] = useState<SupportedLocale>('en');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [tenantCode, setTenantCode] = useState('SCH-001');
  const [selectedPortal, setSelectedPortal] = useState<'admin' | 'staff' | 'teacher' | 'student' | 'parent'>('admin');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const t = (key: string) => getTranslation(locale, key);
  const dir = locale === 'ur' ? 'rtl' : 'ltr';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    // Demo authentication routing for foundation portals
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = `/${selectedPortal}`;
    }, 500);
  };

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 flex flex-col justify-between antialiased font-sans">
      {/* Top Navbar */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">School-ERP</h1>
            <p className="text-xs text-slate-500 font-medium">Commercial Edition</p>
          </div>
        </div>

        <LanguageSwitch
          currentLocale={locale}
          onLocaleChange={(newLocale) => {
            setLocale(newLocale);
            document.documentElement.dir = newLocale === 'ur' ? 'rtl' : 'ltr';
            document.documentElement.lang = newLocale;
          }}
        />
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t('auth.login_title')}</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">{t('auth.login_subtitle')}</p>
          </div>

          {/* Portal Switcher Selector */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Portal / پورٹل منتخب کریں
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {(['admin', 'staff', 'teacher', 'student', 'parent'] as const).map((portal) => (
                <button
                  key={portal}
                  type="button"
                  onClick={() => setSelectedPortal(portal)}
                  className={`py-1.5 px-2 rounded-lg font-medium border text-center transition-all capitalize ${
                    selectedPortal === portal
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {portal}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* School Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('auth.tenant_label')}
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg ps-9 pe-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="SCH-001"
                />
              </div>
            </div>

            {/* Username / Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('auth.username_label')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg ps-9 pe-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="admin"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  {t('auth.password_label')}
                </label>
                <a href="#forgot" className="text-[11px] text-blue-600 hover:underline">
                  {t('auth.forgot_password')}
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg ps-9 pe-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>{t('auth.sign_in_button')} ({selectedPortal})</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} School-ERP. All rights reserved. (Single-Campus Multi-Tenant Edition)
      </footer>
    </div>
  );
}
