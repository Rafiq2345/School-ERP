'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthenticatedUser, TenantContext } from '@/lib/types';
import { BookOpen, CalendarCheck, CreditCard, Award } from 'lucide-react';

const mockStudentUser: AuthenticatedUser = {
  id: 'usr-student-01',
  tenantId: 'tenant-sch-001',
  username: 'Ali Rafiq',
  email: 'ali.rafiq@student.greenwood.edu.pk',
  userType: 'STUDENT',
  preferredLocale: 'en',
  roles: ['STUDENT'],
  permissions: ['STUDENTS:VIEW'],
};

const mockTenant: TenantContext = {
  tenantId: 'tenant-sch-001',
  tenantCode: 'SCH-001',
  schoolName: 'Greenwood International School',
};

export default function StudentPortalPage() {
  return (
    <AppShell user={mockStudentUser} tenant={mockTenant} activePath="/student">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Student Learning Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Student: <strong className="text-slate-800">{mockStudentUser.username}</strong> | Roll No: <strong>42</strong> | Grade 9 - Section A
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Attendance</span>
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">94.8%</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">Regular Status</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Fee Status</span>
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">Paid</p>
            <p className="text-[11px] text-slate-500 mt-1">August Voucher Settled</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Latest GPA</span>
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">3.85 / 4.0</p>
            <p className="text-[11px] text-purple-600 mt-1 font-medium">Grade A+ (Term 1)</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
