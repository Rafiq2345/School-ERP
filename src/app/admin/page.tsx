import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { AuthenticatedUser, TenantContext } from '@/lib/types';
import {
  GraduationCap,
  Users,
  CreditCard,
  CalendarCheck,
  UserPlus,
  Receipt,
  FileCheck,
  Sliders,
} from 'lucide-react';

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

export default function AdminDashboardPage() {
  return (
    <AppShell user={mockAdminUser} tenant={mockTenant} activePath="/admin">
      <div className="space-y-6">
        {/* Welcome & Quick Action Header */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Welcome, {mockAdminUser.username}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900">{mockTenant.schoolName}</span>
              <span className="text-slate-300">•</span>
              <span className="text-blue-700 font-medium">Academic Session: 2026-2027</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shadow-2xs"
            >
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Administration Configuration</span>
            </Link>
          </div>
        </div>

        {/* Operational Overview Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Enrolled Students</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">1,240</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">Active Enrollment</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Faculty & Staff Members</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">84</p>
            <p className="text-[11px] text-slate-500 mt-1">Teaching & Operations</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Fee Billing (This Month)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">Rs. 4.2M</p>
            <p className="text-[11px] text-blue-600 mt-1 font-medium">88% Realized to Date</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Today&apos;s Student Attendance</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">96.4%</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">1,195 Present</p>
          </div>
        </div>

        {/* Operational Quick Access Hub */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            School Operational Hub
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <Link
              href="/admin/admissions"
              className="p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100/60 text-blue-700 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 group-hover:text-blue-700">New Admissions</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Manage intake inquiries and registration</p>
              </div>
            </Link>

            <Link
              href="/admin/attendance"
              className="p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 group-hover:text-emerald-700">Class Attendance</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Daily roll call and absent notifications</p>
              </div>
            </Link>

            <Link
              href="/admin/billing"
              className="p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 group-hover:text-indigo-700">Fee Vouchers</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Generate monthly fees and receipts</p>
              </div>
            </Link>

            <Link
              href="/admin/exams"
              className="p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100/60 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 group-hover:text-purple-700">Examination Hub</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Marks entry and report card release</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
