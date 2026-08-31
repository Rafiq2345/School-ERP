'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Filter,
  RefreshCw,
  ArrowLeft,
  Users,
  Download,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function EmployeeAttendanceRegisterView() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [departments, setDepartments] = useState<any[]>([]);

  const [registerData, setRegisterData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { error } = useToast();

  useEffect(() => {
    fetch('/api/admin/config/departments')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setDepartments(json.data);
      })
      .catch(() => {});
  }, []);

  const fetchRegister = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
        ...(selectedDept !== 'ALL' ? { departmentId: selectedDept } : {}),
      });

      const res = await fetch(`/api/admin/attendance/employees/register?${q.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRegisterData(json.data);
      } else {
        error('Error', json.error?.message || 'Failed to load register');
      }
    } catch {
      error('Network Error', 'Could not load monthly register.');
    } finally {
      setIsLoading(false);
    }
  }, [year, month, selectedDept, error]);

  useEffect(() => {
    fetchRegister();
  }, [fetchRegister]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/attendance/employees"
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Monthly Employee Attendance Register</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/attendance/employees"
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Employee Attendance
          </Link>
          <Link
            href="/admin/attendance/employees/shifts"
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Shift Management
          </Link>
          <Link
            href="/admin/attendance/employees/shifts/assignments"
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Shift Assignments
          </Link>
          <Link
            href="/admin/attendance/employees/corrections"
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Audit &amp; Corrections
          </Link>
          <p className="text-xs text-slate-500 mt-1 ml-9">
            Consolidated monthly matrix of daily staff attendance, total working hours, and absences
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Month &amp; Year</label>
            <div className="flex items-center gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-semibold"
              >
                {monthNames.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-semibold"
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-semibold"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-3xs font-bold">
          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">P: Present</span>
          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">L: Late</span>
          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">A: Absent</span>
          <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">LV: Leave</span>
          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">H: Holiday</span>
        </div>
      </div>

      {/* Register Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-3xs font-bold text-slate-500 uppercase">
                <th className="py-3 px-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 min-w-[160px]">
                  Employee
                </th>
                {registerData?.calendarDays.map((cd: any) => (
                  <th
                    key={cd.date}
                    className={`py-2 px-1 text-center font-mono text-3xs min-w-[28px] border-r border-slate-100 ${
                      cd.isWeeklyOff ? 'bg-slate-100 text-slate-400' : cd.isHoliday ? 'bg-purple-50 text-purple-600' : ''
                    }`}
                  >
                    <div>{cd.dayNumber}</div>
                    <div className="text-[9px] font-normal">{cd.dayName[0]}</div>
                  </th>
                ))}
                <th className="py-3 px-2 text-center bg-slate-50 min-w-[40px] font-bold text-emerald-700">P</th>
                <th className="py-3 px-2 text-center bg-slate-50 min-w-[40px] font-bold text-rose-700">A</th>
                <th className="py-3 px-2 text-center bg-slate-50 min-w-[40px] font-bold text-sky-700">LV</th>
                <th className="py-3 px-2 text-center bg-slate-50 min-w-[50px] font-bold text-slate-800">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={36} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading monthly register...
                  </td>
                </tr>
              ) : registerData?.employees?.length === 0 ? (
                <tr>
                  <td colSpan={36} className="py-12 text-center text-slate-400">
                    No employee attendance records found for this period.
                  </td>
                </tr>
              ) : (
                registerData?.employees?.map((emp: any) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 sticky left-0 bg-white z-10 border-r border-slate-200">
                      <div className="font-bold text-slate-900 truncate max-w-[150px]">{emp.name}</div>
                      <div className="text-3xs text-slate-400 font-mono">{emp.employeeNo}</div>
                    </td>

                    {registerData.calendarDays.map((cd: any) => {
                      const dayRec = emp.dailyStatuses[cd.dayNumber];
                      let badge = <span className="text-slate-300">•</span>;

                      if (dayRec && dayRec.status !== 'UNMARKED') {
                        if (dayRec.status === 'PRESENT') {
                          badge = <span className="text-emerald-700 font-bold">P</span>;
                        } else if (dayRec.status === 'LATE') {
                          badge = <span className="text-amber-700 font-bold">L</span>;
                        } else if (dayRec.status === 'ABSENT') {
                          badge = <span className="text-rose-600 font-bold">A</span>;
                        } else if (dayRec.status === 'ON_LEAVE') {
                          badge = <span className="text-sky-600 font-bold">LV</span>;
                        } else if (dayRec.status === 'HALF_DAY') {
                          badge = <span className="text-orange-600 font-bold">HD</span>;
                        } else if (dayRec.status === 'HOLIDAY') {
                          badge = <span className="text-purple-600 font-bold">H</span>;
                        } else if (dayRec.status === 'OFF_DAY') {
                          badge = <span className="text-slate-400 font-semibold">OFF</span>;
                        }
                      } else if (cd.isWeeklyOff) {
                        badge = <span className="text-slate-300 font-semibold">OFF</span>;
                      } else if (cd.isHoliday) {
                        badge = <span className="text-purple-400 font-semibold">H</span>;
                      }

                      return (
                        <td
                          key={cd.date}
                          className={`py-2 px-1 text-center font-mono text-3xs border-r border-slate-50 ${
                            cd.isWeeklyOff ? 'bg-slate-50/50' : cd.isHoliday ? 'bg-purple-50/30' : ''
                          }`}
                        >
                          {badge}
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-2 text-center font-bold text-emerald-700 bg-emerald-50/30">
                      {emp.totals.present}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-rose-700 bg-rose-50/30">
                      {emp.totals.absent}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-sky-700 bg-sky-50/30">
                      {emp.totals.leave}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800 bg-slate-50/40">
                      {emp.totals.totalWorkedHours}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
