'use client';

import React from 'react';
import { ModuleNavConfig } from '@/lib/navigation/module-nav';
import { SupportedLocale } from '@/lib/types';

interface ModuleSubNavProps {
  config: ModuleNavConfig;
  activePath: string;
  locale: SupportedLocale;
}

export function ModuleSubNav({ config, activePath, locale }: ModuleSubNavProps) {
  return (
    <div className="bg-slate-50/90 border-b border-slate-200/80 px-3 sm:px-6 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between py-1.5 overflow-x-auto scrollbar-none">
        {/* Module Title Badge */}
        <div className="flex items-center gap-2 me-3 flex-shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md border border-blue-200/60">
            {locale === 'ur' ? config.moduleNameUr : config.moduleName}
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
        </div>

        {/* Contextual Sub-Nav Items */}
        <div className="flex items-center gap-1 text-xs whitespace-nowrap">
          {config.items.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === config.items.length - 1;
            const isActive =
              activePath === item.href ||
              (item.href !== config.basePath && activePath.startsWith(item.href));

            // Specialized styling for Audit and Reports & Analytics
            return (
              <a
                key={item.id}
                href={item.href}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white text-blue-700 font-bold shadow-2xs border border-slate-200/90'
                    : isLast
                    ? 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50/60 font-semibold'
                    : item.isAudit
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
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
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
