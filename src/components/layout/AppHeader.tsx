'use client';

import React from 'react';
import Link from 'next/link';
import { School, Search, Bell, Sliders } from 'lucide-react';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left Side: School Identity & Administration Configuration */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xs">
              <School className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm sm:text-base text-slate-900 leading-tight truncate max-w-[200px] sm:max-w-xs">
                {tenant.schoolName}
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                {t('app.tagline')}
              </span>
            </div>
          </div>

          {/* Clearly Accessible "Administration Configuration" Control */}
          {user.userType === 'ADMIN' && (
            <Link
              href="/admin/settings"
              title={t('app.admin_config')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-all shadow-2xs ms-2"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('app.admin_config')}</span>
            </Link>
          )}
        </div>

        {/* Global Search Bar (Desktop) */}
        <div className="hidden md:flex items-center flex-1 max-w-sm mx-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('app.search_placeholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg ps-9 pe-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Right Side Controls: Notifications, Language Switch, Clean User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Notifications Button */}
          <button
            type="button"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition-colors cursor-pointer"
            title={t('app.notifications')}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
          </button>

          {/* Language Switch */}
          <LanguageSwitch currentLocale={locale} onLocaleChange={onLocaleChange} />

          {/* Clean User Menu (Avatar Only, No Text Block) */}
          <UserMenu user={user} tenant={tenant} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
