'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthenticatedUser, TenantContext } from '@/lib/types';
import { Users, GraduationCap, CreditCard, CalendarCheck, FileText } from 'lucide-react';

const mockParentUser: AuthenticatedUser = {
  id: 'usr-parent-01',
  tenantId: 'tenant-sch-001',
  username: 'Choudhary Rafiq',
  email: 'choudharyrafiq79@gmail.com',
  userType: 'PARENT',
  preferredLocale: 'en',
  roles: ['PARENT'],
  permissions: ['STUDENTS:VIEW', 'BILLING:VIEW'],
};

const mockTenant: TenantContext = {
  tenantId: 'tenant-sch-001',
  tenantCode: 'SCH-001',
  schoolName: 'Greenwood International School',
};

const childrenData = [
  { id: 'c1', name: 'Ali Rafiq', grade: 'Grade 9-A', rollNo: 42, attendance: '94.8%', feeStatus: 'Paid', feeAmount: 'Rs. 4,500' },
  { id: 'c2', name: 'Ayesha Rafiq', grade: 'Grade 6-B', rollNo: 15, attendance: '98.2%', feeStatus: 'Paid', feeAmount: 'Rs. 4,000' },
];

export default function ParentPortalPage() {
  const [selectedChildId, setSelectedChildId] = useState(childrenData[0].id);
  const activeChild = childrenData.find((c) => c.id === selectedChildId) || childrenData[0];

  return (
    <AppShell user={mockParentUser} tenant={mockTenant} activePath="/parent">
      <div className="space-y-6">
        {/* Parent Header & Child Switcher */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Parent Guardian Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Welcome, <strong className="text-slate-800">{mockParentUser.username}</strong> | Multi-Child Access
            </p>
          </div>

          {/* Child Switcher Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <Users className="w-4 h-4 text-slate-500 ms-1" />
            {childrenData.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => setSelectedChildId(child.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedChildId === child.id
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {child.name} ({child.grade})
              </button>
            ))}
          </div>
        </div>

        {/* Active Child Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Student Profile</span>
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-slate-900 mt-2">{activeChild.name}</p>
            <p className="text-[11px] text-slate-500 mt-1">{activeChild.grade} | Roll No: {activeChild.rollNo}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Attendance Record</span>
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{activeChild.attendance}</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">Excellent Attendance</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Monthly Fee Status</span>
              <CreditCard className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{activeChild.feeStatus}</p>
            <p className="text-[11px] text-blue-600 mt-1 font-medium">{activeChild.feeAmount} (August 2026)</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
