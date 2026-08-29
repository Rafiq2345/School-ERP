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
  History,
  Settings,
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

  // Define top navigation items according to user persona
  const navItems = [
    { label: t('nav.dashboard'), href: `/${userType.toLowerCase()}`, icon: LayoutDashboard },
    ...(userType === 'ADMIN'
      ? [
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
          { label: t('nav.publishing'), href: '/admin/publishing', icon: Send },
          { label: t('nav.audit'), href: '/admin/audit', icon: History },
          { label: t('nav.settings'), href: '/admin/settings', icon: Settings },
        ]
      : userType === 'TEACHER'
      ? [
          { label: t('nav.academics'), href: '/teacher/classes', icon: BookOpen },
          { label: t('nav.attendance'), href: '/teacher/attendance', icon: CalendarCheck },
          { label: t('nav.exams'), href: '/teacher/marks', icon: FileCheck },
        ]
      : userType === 'STUDENT'
      ? [
          { label: t('nav.academics'), href: '/student/timetable', icon: BookOpen },
          { label: t('nav.attendance'), href: '/student/attendance', icon: CalendarCheck },
          { label: t('nav.billing'), href: '/student/vouchers', icon: CreditCard },
          { label: t('nav.exams'), href: '/student/results', icon: FileCheck },
        ]
      : userType === 'PARENT'
      ? [
          { label: t('nav.students'), href: '/parent/children', icon: GraduationCap },
          { label: t('nav.billing'), href: '/parent/fees', icon: CreditCard },
          { label: t('nav.attendance'), href: '/parent/attendance', icon: CalendarCheck },
          { label: t('nav.exams'), href: '/parent/reports', icon: FileCheck },
        ]
      : [
          { label: t('nav.attendance'), href: '/staff/attendance', icon: CalendarCheck },
          { label: t('nav.hr'), href: '/staff/payslips', icon: Users },
        ]),
  ];

  return (
    <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 shadow-sm overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1 sm:gap-2 max-w-7xl mx-auto py-1 min-w-max">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePath === item.href || (item.href !== `/${userType.toLowerCase()}` && activePath.startsWith(item.href));

          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
