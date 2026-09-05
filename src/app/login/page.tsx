'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { School, Lock, User, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { SupportedLocale } from '@/lib/types';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';
import { getTranslation } from '@/lib/i18n/translations';
import { validateEmail, validatePakistanMobile, FIELD_MAX_LENGTHS } from '@/lib/validation/auth-validation';

export default function LoginPage() {
  const [locale, setLocale] = useState<SupportedLocale>('en');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const t = (key: string) => getTranslation(locale, key);
  const dir = locale === 'ur' ? 'rtl' : 'ltr';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    const trimmedInput = usernameOrEmail.trim();
    if (!trimmedInput) {
      setErrorMessage(t('auth.invalid_credentials'));
      setIsLoading(false);
      return;
    }

    if (trimmedInput.includes('@')) {
      const emailRes = validateEmail(trimmedInput);
      if (!emailRes.isValid) {
        setErrorMessage(emailRes.error || 'Enter a valid email address.');
        setIsLoading(false);
        return;
      }
    } else if (trimmedInput.startsWith('03') || /^\d+$/.test(trimmedInput.replace(/[\s\-]/g, ''))) {
      const mobileRes = validatePakistanMobile(trimmedInput);
      if (!mobileRes.isValid) {
        setErrorMessage(mobileRes.error || 'Enter a valid 11-digit mobile number (e.g. 03001234567).');
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usernameOrEmail: trimmedInput,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error?.message || t('auth.invalid_credentials'));
        setIsLoading(false);
        return;
      }

      // If user is flagged with temporary password, force change password
      if (data.data?.mustChangePassword) {
        window.location.href = '/change-password';
        return;
      }

      // Automatic server-side redirection based on authenticated user record
      if (data.data?.redirectUrl) {
        window.location.href = data.data.redirectUrl;
      } else {
        window.location.href = '/admin';
      }
    } catch {
      setErrorMessage('Network connection error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div
      dir={dir}
      className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 flex flex-col justify-between antialiased font-sans"
    >
      {/* Top Navbar */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">School-ERP</h1>
            <p className="text-xs text-slate-500 font-medium">Enterprise Management System</p>
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
          {/* Card Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t('auth.login_title')}</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">{t('auth.login_subtitle')}</p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username or Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('auth.username_label')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  maxLength={FIELD_MAX_LENGTHS.USERNAME}
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-9 pe-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="admin, teacher, student, mobile..."
                />
              </div>
            </div>

            {/* Password with Accessible Show/Hide Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {t('auth.password_label')}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  {t('auth.forgot_password')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  maxLength={FIELD_MAX_LENGTHS.PASSWORD}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-9 pe-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>{t('auth.sign_in_button')}</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} School-ERP. All rights reserved. (Commercial Single-Campus Edition)
      </footer>
    </div>
  );
}
