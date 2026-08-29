'use client';

import React, { useState } from 'react';
import { AuthenticatedUser, SupportedLocale, TenantContext } from '@/lib/types';
import { AppHeader } from './AppHeader';
import { AppNav } from './AppNav';

interface AppShellProps {
  user: AuthenticatedUser;
  tenant: TenantContext;
  activePath: string;
  children: React.ReactNode;
}

export function AppShell({ user, tenant, activePath, children }: AppShellProps) {
  const [locale, setLocale] = useState<SupportedLocale>(user.preferredLocale || 'en');
  const dir = locale === 'ur' ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Application Header */}
      <AppHeader
        user={user}
        tenant={tenant}
        locale={locale}
        onLocaleChange={(newLocale) => {
          setLocale(newLocale);
          document.documentElement.dir = newLocale === 'ur' ? 'rtl' : 'ltr';
          document.documentElement.lang = newLocale;
        }}
      />

      {/* Top Navigation Bar (No permanent left sidebar) */}
      <AppNav activePath={activePath} userType={user.userType} locale={locale} />

      {/* Main Responsive Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Standard ERP Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} {tenant.schoolName}. All rights reserved.</span>
          <span className="text-[11px] text-slate-400">School-ERP v0.1.0 (Commercial Edition)</span>
        </div>
      </footer>
    </div>
  );
}
