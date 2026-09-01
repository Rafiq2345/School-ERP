'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  FileText,
  ListOrdered,
  FileCheck2,
  Users,
  Coins,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Plus,
  Clock,
} from 'lucide-react';
import { LeaveManagementNav } from './LeaveManagementNav';

export function LeaveDashboardView() {
  const [stats, setStats] = useState({
    totalLeaveTypes: 0,
    activePolicies: 0,
    activeAssignments: 0,
    totalApplications: 0,
    pendingApplications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [typesRes, policiesRes, assignmentsRes, appsRes] = await Promise.all([
          fetch('/api/admin/hr/leaves/types'),
          fetch('/api/admin/hr/leaves/policies'),
          fetch('/api/admin/hr/leaves/assignments'),
          fetch('/api/admin/hr/leaves/applications'),
        ]);

        const typesData = await typesRes.json();
        const policiesData = await policiesRes.json();
        const assignmentsData = await assignmentsRes.json();
        const appsData = await appsRes.json();

        const appsList = appsData.data?.items || [];

        setStats({
          totalLeaveTypes: typesData.data?.length || 0,
          activePolicies: policiesData.data?.filter((p: any) => p.status === 'ACTIVE').length || 0,
          activeAssignments: assignmentsData.data?.filter((a: any) => a.isActive).length || 0,
          totalApplications: appsData.data?.total || 0,
          pendingApplications: appsList.filter((a: any) => a.status === 'PENDING_APPROVAL' || a.status === 'SUBMITTED').length,
        });
      } catch (e) {
        console.error('Error loading leave stats', e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <LeaveManagementNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <CalendarDays className="w-7 h-7 text-blue-600" />
              Leave Management & Applications
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure leave policies, assign duty schedules, submit employee leave requests, and manage transactional entitlement balances.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/hr/leaves/applications/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Leave Application
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Applications</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalApplications}</h3>
              <p className="text-xs text-slate-400">Total submitted & drafted</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Approval</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-0.5">{stats.pendingApplications}</h3>
              <p className="text-xs text-amber-600">Awaiting approval engine</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Policies</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.activePolicies}</h3>
              <p className="text-xs text-slate-400">Configured institutional rules</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Assignments</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.activeAssignments}</h3>
              <p className="text-xs text-slate-400">Department & staff mappings</p>
            </div>
          </div>
        </div>

        {/* Navigation Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/hr/leaves/applications"
            className="group bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                1. Leave Applications
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Submit and manage leave applications across Full Day, Half Day, Multi-Shift duty segments, and Hourly short leaves with live validation.
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-blue-600 mt-4">
              <span>View Applications</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/hr/leaves/policies"
            className="group bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                2. Leave Policies & Probation
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Create versioned annual leave rules, allocation methods, probation entitlement treatment, and year-end carry-forward readiness.
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-indigo-600 mt-4">
              <span>Manage Policies</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/hr/leaves/entitlements"
            className="group bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                3. Entitlements & Ledgers
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Execute annual allocation batches, inspect double-entry employee ledgers, and perform policy-governed manual balance adjustments.
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600 mt-4">
              <span>Entitlement Wizard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Phase 2 Honest Roadmap Notice */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Phase 2 Step 1 Active: Applications & Engine
            </div>
            <h3 className="text-lg font-bold">Upcoming Step 2: Configurable Multi-Level Approval Engine</h3>
            <p className="text-sm text-slate-300">
              Configurable approval tiers (Department Head $	o$ Principal $	o$ Management), delegated approvers, and escalation timers will connect in Step 2.
            </p>
          </div>
          <Link
            href="/admin/hr/leaves/applications"
            className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-sm rounded-lg shadow-xs transition-colors whitespace-nowrap"
          >
            Manage Applications
          </Link>
        </div>
      </div>
    </div>
  );
}
