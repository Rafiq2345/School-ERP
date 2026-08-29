'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthenticatedUser, TenantContext } from '@/lib/types';
import { CalendarCheck, DollarSign, FileText, UserCheck } from 'lucide-react';

const mockStaffUser: AuthenticatedUser = {
  id: 'usr-staff-01',
  tenantId: 'tenant-sch-001',
  username: 'Ahmed Khan',
  email: 'ahmed.khan@greenwood.edu.pk',
  userType: 'EMPLOYEE',
  preferredLocale: 'en',
  roles: ['ACCOUNTS_ASSISTANT'],
  permissions: ['ATTENDANCE:VIEW', 'HR_PAYROLL:VIEW'],
};

const mockTenant: TenantContext = {
  tenantId: 'tenant-sch-001',
  tenantCode: 'SCH-001',
  schoolName: 'Greenwood International School',
};

export default function StaffPortalPage() {
  return (
    <AppShell user={mockStaffUser} tenant={mockTenant} activePath="/staff">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Employee Self-Service Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Logged in as: <strong className="text-slate-800">{mockStaffUser.username}</strong> ({mockStaffUser.userType})
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Monthly Attendance</span>
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">96.5%</p>
            <p className="text-[11px] text-slate-500 mt-1">Present 22 / 23 Days</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Leave Balance</span>
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">14 Days</p>
            <p className="text-[11px] text-slate-500 mt-1">Annual & Casual</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Latest Payslip</span>
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">Published</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">August 2026</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
