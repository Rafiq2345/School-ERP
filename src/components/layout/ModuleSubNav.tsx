'use client';

import React from 'react';
import Link from 'next/link';
import { ModuleNavConfig } from '@/lib/navigation/module-nav';
import { SupportedLocale } from '@/lib/types';

interface ModuleSubNavProps {
  config: ModuleNavConfig;
  activePath: string;
  locale: SupportedLocale;
}

export function ModuleSubNav({ config, activePath, locale }: ModuleSubNavProps) {
  return (
    <div className="bg-slate-50/95 border-b border-slate-200/90 px-3 sm:px-6 shadow-2xs z-20 relative">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 py-1.5">
        {/* Module Title Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200/70">
            {locale === 'ur' ? config.moduleNameUr : config.moduleName}
          </span>
          <span className="text-slate-300 hidden md:inline">•</span>
        </div>

        {/* Contextual Sub-Nav Items: Fully responsive wrap, NO horizontal scrollbar, NO truncation */}
        <div className="flex items-center flex-wrap gap-1 text-2xs sm:text-xs">
          {config.items.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === config.items.length - 1;
            const isActive =
              activePath === item.href ||
              (item.href !== config.basePath && activePath.startsWith(item.href));

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-blue-700 font-bold shadow-2xs border border-slate-200'
                    : isLast
                    ? 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50/80 font-bold bg-indigo-50/40 border border-indigo-100/60'
                    : item.isAudit
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive
                      ? 'text-blue-600'
                      : isLast
                      ? 'text-indigo-600'
                      : item.isAudit
                      ? 'text-amber-600'
                      : 'text-slate-400'
                  }`}
                />
                <span>{locale === 'ur' ? item.labelUr : item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
