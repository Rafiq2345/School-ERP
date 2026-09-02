'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  FileText,
  Inbox,
  GitBranch,
  ListOrdered,
  FileCheck2,
  Users,
  Coins,
  ShieldAlert,
  Scale,
  Calculator,
  RefreshCw,
} from 'lucide-react';

export function LeaveManagementNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/admin/hr/leaves', icon: CalendarDays, exact: true },
    { label: 'Applications', href: '/admin/hr/leaves/applications', icon: FileText },
    { label: 'Approval Inbox', href: '/admin/hr/leaves/approvals', icon: Inbox },
    { label: 'Workflows', href: '/admin/hr/leaves/workflows', icon: GitBranch },
    { label: 'Leave Types', href: '/admin/hr/leaves/types', icon: ListOrdered },
    { label: 'Leave Policies', href: '/admin/hr/leaves/policies', icon: FileCheck2 },
    { label: 'Payroll Rules', href: '/admin/hr/leaves/payroll-rules', icon: Scale },
    { label: 'Deductions & Reconciliation', href: '/admin/hr/leaves/payroll-deductions', icon: Calculator },
    { label: 'Year-End Processing', href: '/admin/hr/leaves/year-end', icon: RefreshCw },
    { label: 'Policy Assignments', href: '/admin/hr/leaves/assignments', icon: Users },
    { label: 'Entitlements & Ledger', href: '/admin/hr/leaves/entitlements', icon: Coins },
    { label: 'Leave Audit', href: '/admin/hr/leaves/audit', icon: ShieldAlert },
  ];

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-2.5 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs sm:text-sm font-medium scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin/hr/leaves');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
