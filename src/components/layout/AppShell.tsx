'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthenticatedUser, SupportedLocale, TenantContext } from '@/lib/types';
import { AppHeader } from './AppHeader';
import { AppNav } from './AppNav';
import { ModuleSubNav } from './ModuleSubNav';
import { getActiveModuleConfig } from '@/lib/navigation/module-nav';
import { ToastProvider } from '@/components/ui/Toast';

interface AppShellProps {
  user: AuthenticatedUser;
  tenant: TenantContext;
  activePath?: string;
  children: React.ReactNode;
}

export function AppShell({ user, tenant, activePath, children }: AppShellProps) {
  const [locale, setLocale] = useState<SupportedLocale>(user.preferredLocale || 'en');
  const dir = locale === 'ur' ? 'rtl' : 'ltr';

  const pathname = usePathname();
  const currentPath = pathname || activePath || '/';

  // Automatically resolve active module configuration for contextual sub-navigation
  const activeModuleConfig = getActiveModuleConfig(currentPath);

  return (
    <ToastProvider>
      <div dir={dir} className="min-h-screen bg-[#f0f4f9] flex flex-col antialiased">
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

        {/* Top Main Navigation Bar */}
        <AppNav activePath={currentPath} userType={user.userType} locale={locale} />

        {/* Contextual Module Sub-Navigation (Rendered when inside a specific module) */}
        {activeModuleConfig && (
          <ModuleSubNav
            config={activeModuleConfig}
            activePath={currentPath}
            locale={locale}
          />
        )}

        {/* Main Responsive Content Area (Full width with balanced 24-32px gutters) */}
        <main className="flex-1 w-full px-4 sm:px-6 xl:px-8 py-3 sm:py-3.5">
          {children}
        </main>

        {/* Standard ERP Executive Footer */}
        <footer className="bg-white border-t border-slate-200/90 py-2.5 text-xs text-slate-500 shadow-2xs">
          <div className="w-full px-4 sm:px-6 xl:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-3xs sm:text-xs">
            <span>&copy; {new Date().getFullYear()} {tenant.schoolName}. All rights reserved.</span>
            <div className="flex items-center gap-3 text-slate-500">
              <span className="hover:text-slate-800 transition-colors cursor-pointer">Privacy Policy</span>
              <span className="text-slate-300">•</span>
              <span className="hover:text-slate-800 transition-colors cursor-pointer">Support</span>
              <span className="text-slate-300">•</span>
              <span>Version 0.1.0</span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                System Online
              </span>
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
