'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  CreditCard,
  FileCheck,
  Users,
  Receipt,
  Library,
  Package,
  Send,
  History,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import { SupportedLocale, UserType } from '@/lib/types';
import { getTranslation } from '@/lib/i18n/translations';

interface AppNavProps {
  activePath: string;
  userType: UserType;
  locale: SupportedLocale;
}

export function AppNav({ activePath, userType, locale }: AppNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const t = (key: string) => getTranslation(locale, key);

  // Close "More" menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary operational modules (always directly visible)
  const primaryAdminNav = [
    { label: t('nav.admissions'), href: '/admin/admissions', icon: UserPlus },
    { label: t('nav.students'), href: '/admin/students', icon: GraduationCap },
    { label: t('nav.academics'), href: '/admin/academics', icon: BookOpen },
    { label: t('nav.attendance'), href: '/admin/attendance', icon: CalendarCheck },
    { label: t('nav.billing'), href: '/admin/billing', icon: CreditCard },
    { label: t('nav.exams'), href: '/admin/exams', icon: FileCheck },
    { label: t('nav.hr'), href: '/admin/hr', icon: Users },
    { label: t('nav.accounts'), href: '/admin/accounts', icon: Receipt },
    { label: t('nav.library'), href: '/admin/library', icon: Library },
    { label: t('nav.inventory'), href: '/admin/inventory', icon: Package },
  ];

  // Secondary / lower-frequency modules (housed inside "More" dropdown)
  const moreAdminNav = [
    { label: t('nav.communication'), href: '/admin/communication', icon: Send },
    { label: t('nav.reports'), href: '/admin/reports', icon: BarChart3 },
    { label: t('nav.audit'), href: '/admin/audit', icon: History },
  ];

  const teacherNav = [
    { label: t('nav.academics'), href: '/teacher/classes', icon: BookOpen },
    { label: t('nav.attendance'), href: '/teacher/attendance', icon: CalendarCheck },
    { label: t('nav.exams'), href: '/teacher/marks', icon: FileCheck },
  ];

  const studentNav = [
    { label: t('nav.academics'), href: '/student/timetable', icon: BookOpen },
    { label: t('nav.attendance'), href: '/student/attendance', icon: CalendarCheck },
    { label: t('nav.billing'), href: '/student/vouchers', icon: CreditCard },
    { label: t('nav.exams'), href: '/student/results', icon: FileCheck },
  ];

  const parentNav = [
    { label: t('nav.students'), href: '/parent/children', icon: GraduationCap },
    { label: t('nav.billing'), href: '/parent/fees', icon: CreditCard },
    { label: t('nav.attendance'), href: '/parent/attendance', icon: CalendarCheck },
    { label: t('nav.exams'), href: '/parent/reports', icon: FileCheck },
  ];

  const staffNav = [
    { label: t('nav.attendance'), href: '/staff/attendance', icon: CalendarCheck },
    { label: t('nav.hr'), href: '/staff/payslips', icon: Users },
  ];

  const isMoreActive = moreAdminNav.some(
    (item) => activePath === item.href || activePath.startsWith(item.href)
  );

  return (
    <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 shadow-xs relative z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1 py-1">
        {/* Navigation Items in a single, professional row (NO scrollbar) */}
        <div className="flex items-center flex-wrap gap-0.5 sm:gap-1 text-xs">
          {/* Dashboard Home Link */}
          <a
            href={`/${userType.toLowerCase()}`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              activePath === `/${userType.toLowerCase()}`
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>{t('nav.dashboard')}</span>
          </a>

          {/* Admin Navigation */}
          {userType === 'ADMIN' && (
            <>
              {primaryAdminNav.map((item) => {
                const Icon = item.icon;
                const isActive = activePath === item.href || activePath.startsWith(item.href);

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </a>
                );
              })}

              {/* "More" Dropdown for Lower-Frequency Modules */}
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    isMoreActive || isMoreOpen
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>{t('nav.more')}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMoreOpen && (
                  <div className="absolute start-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                    {moreAdminNav.map((item) => {
                      const Icon = item.icon;
                      const isActive = activePath === item.href || activePath.startsWith(item.href);

                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className={`flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Teacher Navigation */}
          {userType === 'TEACHER' &&
            teacherNav.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.href || activePath.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </a>
              );
            })}

          {/* Student Navigation */}
          {userType === 'STUDENT' &&
            studentNav.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.href || activePath.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </a>
              );
            })}

          {/* Parent Navigation */}
          {userType === 'PARENT' &&
            parentNav.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.href || activePath.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </a>
              );
            })}

          {/* Staff Navigation */}
          {userType === 'EMPLOYEE' &&
            staffNav.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.href || activePath.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </a>
              );
            })}
        </div>
      </div>
    </nav>
  );
}
