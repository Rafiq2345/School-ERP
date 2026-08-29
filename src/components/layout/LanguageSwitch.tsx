'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { SupportedLocale } from '@/lib/types';

interface LanguageSwitchProps {
  currentLocale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
}

export function LanguageSwitch({ currentLocale, onLocaleChange }: LanguageSwitchProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-sm">
      <Globe className="w-4 h-4 text-slate-500 ms-1" />
      <button
        type="button"
        onClick={() => onLocaleChange('en')}
        className={`px-2 py-1 rounded font-medium transition-all ${
          currentLocale === 'en'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => onLocaleChange('ur')}
        className={`px-2 py-1 rounded font-medium transition-all font-urdu text-xs ${
          currentLocale === 'ur'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        اردو
      </button>
    </div>
  );
}
