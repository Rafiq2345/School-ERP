'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthenticatedUser, TenantContext } from '@/lib/types';
import { Users, GraduationCap, CreditCard, Send, ShieldCheck, History } from 'lucide-react';

const mockAdminUser: AuthenticatedUser = {
  id: 'usr-admin-01',
  tenantId: 'tenant-sch-001',
  username: 'Principal Office',
  email: 'principal@greenwood.edu.pk',
  userType: 'ADMIN',
  preferredLocale: 'en',
  roles: ['SUPER_ADMIN'],
  permissions: ['*'],
};

const mockTenant: TenantContext = {
  tenantId: 'tenant-sch-001',
  tenantCode: 'SCH-001',
  schoolName: 'Greenwood International School',
};

export default function AdminPortalPage() {
  return (
    <AppShell user={mockAdminUser} tenant={mockTenant} activePath="/admin">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Welcome, {mockAdminUser.username}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Active Tenant: <strong className="text-blue-700">{mockTenant.schoolName}</strong> ({mockTenant.tenantCode}) | Single-Campus Edition
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Tenant Isolated (Active)
            </span>
          </div>
        </div>

        {/* Foundation Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Enrolled</span>
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">1,240</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">Active Session 2026-2027</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Staff & Faculty</span>
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">84</p>
            <p className="text-[11px] text-slate-500 mt-1">Teaching & Operations</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Fee Vouchers</span>
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">Rs. 4.2M</p>
            <p className="text-[11px] text-blue-600 mt-1 font-medium">Billed this month</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Publishing Status</span>
              <Send className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">3 Batches</p>
            <p className="text-[11px] text-amber-600 mt-1 font-medium">1 Under Review</p>
          </div>
        </div>

        {/* Technical Foundation Verification Section */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            Platform Architecture & Foundation Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="font-semibold text-slate-800">1. Top Navigation Shell</p>
              <p className="text-slate-500 mt-0.5">Top-bar architecture active with no permanent left sidebar.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="font-semibold text-slate-800">2. Tenant Boundary</p>
              <p className="text-slate-500 mt-0.5">Scoping enforced via AsyncLocalStorage & Prisma filters.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="font-semibold text-slate-800">3. Localization & RTL</p>
              <p className="text-slate-500 mt-0.5">English (LTR) and Urdu (RTL) togglable in header.</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
