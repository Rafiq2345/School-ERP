'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { School, ShieldAlert, ArrowLeft, Headphones, KeyRound, Building2 } from 'lucide-react';
import { SupportedLocale } from '@/lib/types';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';
import { getTranslation } from '@/lib/i18n/translations';

export default function ForgotPasswordPage() {
  const [locale, setLocale] = useState<SupportedLocale>('en');

  const t = (key: string) => getTranslation(locale, key);
  const dir = locale === 'ur' ? 'rtl' : 'ltr';

  return (
    <div
      dir={dir}
      className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 flex flex-col justify-between antialiased font-sans"
    >
      {/* Top Header */}
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

      {/* Main Guidance Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8 w-full max-w-lg text-center">
          {/* Icon Header */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-5 shadow-sm">
            <KeyRound className="w-7 h-7" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('auth.forgot_password_guidance_title')}
          </h2>

          <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
            {t('auth.forgot_password_guidance_desc')}
          </p>

          {/* Security Information Box */}
          <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-start space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-semibold text-slate-900">
                  {locale === 'ur' ? 'سیکیورٹی و شناخت کی پالیسی' : 'Institutional Security Policy'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {locale === 'ur'
                    ? 'اسکول ای آر پی ایڈمنسٹریٹو رسائی کی حفاظت کے لیے پاس ورڈ کی تبدیلی صرف مجاز ادارے کے انتظامی کنٹرول سے کی جا سکتی ہے۔'
                    : 'To ensure data governance and protect school operational records, administrative password resets must be issued by an authorized school administrator.'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>{locale === 'ur' ? 'پرنسپل / آئی ٹی ایڈمن آفس' : 'Principal Office / IT Admin'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Headphones className="w-4 h-4 text-slate-400" />
                <span>{locale === 'ur' ? 'سافٹ ویئر سپورٹ ڈیسک' : 'ERP Support Desk'}</span>
              </div>
            </div>
          </div>

          {/* Back to Login Action */}
          <div className="pt-2">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3 px-5 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              <span>{t('auth.back_to_login')}</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} School-ERP. All rights reserved. (Commercial Single-Campus Edition)
      </footer>
    </div>
  );
}
