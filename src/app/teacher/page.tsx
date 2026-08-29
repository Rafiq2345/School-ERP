'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthenticatedUser, TenantContext } from '@/lib/types';
import { BookOpen, CalendarCheck, FileCheck, Users } from 'lucide-react';

const mockTeacherUser: AuthenticatedUser = {
  id: 'usr-teacher-01',
  tenantId: 'tenant-sch-001',
  username: 'Ms. Fatima Tariq',
  email: 'fatima.tariq@greenwood.edu.pk',
  userType: 'TEACHER',
  preferredLocale: 'en',
  roles: ['TEACHER'],
  permissions: ['ATTENDANCE:CREATE', 'ATTENDANCE:VIEW', 'EXAMS:CREATE', 'EXAMS:VIEW'],
};

const mockTenant: TenantContext = {
  tenantId: 'tenant-sch-001',
  tenantCode: 'SCH-001',
  schoolName: 'Greenwood International School',
};

export default function TeacherPortalPage() {
  return (
    <AppShell user={mockTeacherUser} tenant={mockTenant} activePath="/teacher">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Teacher Portal & Classroom Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Instructor: <strong className="text-slate-800">{mockTeacherUser.username}</strong> | Department of Mathematics
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Assigned Classes</span>
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">4 Sections</p>
            <p className="text-[11px] text-slate-500 mt-1">Grade 8-A, 8-B, 9-A, 10-A</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Today&apos;s Attendance</span>
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">Marked (3/4)</p>
            <p className="text-[11px] text-amber-600 mt-1 font-medium">1 Class Remaining</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Exam Marks Entry</span>
              <FileCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">Midterm 2026</p>
            <p className="text-[11px] text-blue-600 mt-1">Draft Submission Mode</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
