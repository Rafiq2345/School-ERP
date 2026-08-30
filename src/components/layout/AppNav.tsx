'use client';

import React from 'react';
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
} from 'lucide-react';
import { SupportedLocale, UserType } from '@/lib/types';
import { getTranslation } from '@/lib/i18n/translations';

interface AppNavProps {
  activePath: string;
  userType: UserType;
  locale: SupportedLocale;
}

export function AppNav({ activePath, userType, locale }: AppNavProps) {
  const t = (key: string) => getTranslation(locale, key);

  // Complete Primary Operational Modules for School Admin
  // (All 11 modules directly visible in a single row, NO global Reports item, NO global Audit item)
  const adminNav = [
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
    { label: t('nav.communication'), href: '/admin/communication', icon: Send },
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

  return (
    <nav className="bg-white border-b border-slate-200 px-3 sm:px-6 shadow-2xs relative z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between py-1">
        {/* Single Clean Row of Operational Modules (Zero horizontal scrollbar, No wrapping) */}
        <div className="flex items-center flex-wrap gap-0.5 sm:gap-1 text-xs w-full">
          {/* Dashboard Home Link */}
          <a
            href={`/${userType.toLowerCase()}`}
            className={`flex items-center gap-1.5 px-2 py-1.5 xl:px-2.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activePath === `/${userType.toLowerCase()}`
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>{t('nav.dashboard')}</span>
          </a>

          {/* Admin Navigation: 11 Primary Modules Directly Accessible */}
          {userType === 'ADMIN' &&
            adminNav.map((item) => {
              const Icon = item.icon;
              const isActive =
                activePath === item.href ||
                (item.href !== '/admin' && activePath.startsWith(item.href));

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-1.5 sm:px-2 xl:px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
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

          {/* Teacher Navigation */}
          {userType === 'TEACHER' &&
            teacherNav.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.href || activePath.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
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

          {/* Student Navigation */}
          {userType === 'STUDENT' &&
            studentNav.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.href || activePath.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
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

          {/* Parent Navigation */}
          {userType === 'PARENT' &&
            parentNav.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.href || activePath.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
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

          {/* Staff Navigation */}
          {userType === 'EMPLOYEE' &&
            staffNav.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.href || activePath.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
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
        </div>
      </div>
    </nav>
  );
}
