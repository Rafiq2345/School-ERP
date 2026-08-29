'use client';

import React from 'react';
import { School, Search, Bell } from 'lucide-react';
import { AuthenticatedUser, SupportedLocale, TenantContext } from '@/lib/types';
import { LanguageSwitch } from './LanguageSwitch';
import { UserMenu } from './UserMenu';
import { getTranslation } from '@/lib/i18n/translations';

interface AppHeaderProps {
  user: AuthenticatedUser;
  tenant: TenantContext;
  locale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
  onLogout?: () => void;
}

export function AppHeader({ user, tenant, locale, onLocaleChange, onLogout }: AppHeaderProps) {
  const t = (key: string) => getTranslation(locale, key);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & School Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md">
            <School className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-slate-900 leading-tight">
              {tenant.schoolName}
            </span>
            <span className="text-[11px] text-slate-500 font-medium tracking-wide">
              {t('app.tagline')}
            </span>
          </div>
        </div>

        {/* Global Search Placeholder (Desktop) */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('app.search_placeholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg ps-9 pe-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Controls: Notifications, Language Switch, User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Placeholder */}
          <button
            type="button"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition-colors"
            title={t('app.notifications')}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
          </button>

          {/* Language Switch */}
          <LanguageSwitch currentLocale={locale} onLocaleChange={onLocaleChange} />

          {/* User Menu */}
          <UserMenu user={user} tenant={tenant} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
