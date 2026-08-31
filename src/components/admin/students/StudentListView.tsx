'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit,
  ArrowRightLeft,
  GraduationCap,
  Sparkles,
  Download,
  Calendar,
  Layers,
  LayoutGrid,
  Shield,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTable, Column } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';

interface StudentListItem {
  id: string;
  admissionNo: string;
  registrationNo: string | null;
  nameEn: string;
  fullNameUr: string | null;
  gender: string;
  dob: string;
  photoUrl: string | null;
  nationalId: string | null;
  primaryContactPhone: string | null;
  currentStatus: string;
  category: { id: string; name: string; code: string } | null;
  house: { id: string; name: string; color: string | null } | null;
  currentEnrollment: {
    id: string;
    sessionName: string;
    className: string;
    sectionName: string;
    rollNumber: string | null;
  } | null;
  guardianName: string | null;
  guardianPhone: string | null;
  createdAt: string;
}

export function StudentListView() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, male: 0, female: 0 });

  // Dropdown master options
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; classId: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [houses, setHouses] = useState<{ id: string; name: string }[]>([]);

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedGender, setSelectedGender] = useState('');

  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const { error } = useToast();

  // Load Filter Masters
  useEffect(() => {
    let isMounted = true;
    async function loadMasters() {
      try {
        const [sessRes, clsRes, secRes, catRes, statsRes] = await Promise.all([
          fetch('/api/admin/config/sessions').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
          fetch('/api/admin/config/classes').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
          fetch('/api/admin/config/sections').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
          fetch('/api/admin/config/class-categories').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
          fetch('/api/admin/students/stats').then((r) => r.json()).catch(() => ({ success: false, data: { total: 0, active: 0, male: 0, female: 0 } })),
        ]);

        if (!isMounted) return;
        if (sessRes.success && Array.isArray(sessRes.data)) setSessions(sessRes.data);
        if (clsRes.success && Array.isArray(clsRes.data)) setClasses(clsRes.data);
        if (secRes.success && Array.isArray(secRes.data)) setSections(secRes.data);
        if (catRes.success && Array.isArray(catRes.data)) setCategories(catRes.data);
        if (statsRes.success && statsRes.data) setStats(statsRes.data);
      } catch {
        // Safe fallback
      }
    }
    loadMasters();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedSession) params.set('sessionId', selectedSession);
      if (selectedClass) params.set('classId', selectedClass);
      if (selectedSection) params.set('sectionId', selectedSection);
      if (selectedCategory) params.set('categoryId', selectedCategory);
      if (selectedHouse) params.set('houseId', selectedHouse);
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedGender) params.set('gender', selectedGender);
      params.set('page', String(page));

      const res = await fetch(`/api/admin/students?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setStudents(Array.isArray(json.data) ? json.data : []);
        setTotalRecords(json.pagination?.total || 0);
      } else {
        setStudents([]);
        setTotalRecords(0);
        error('Load Error', json.error?.message || 'Could not load student records.');
      }
    } catch {
      setStudents([]);
      setTotalRecords(0);
      error('Load Error', 'Could not load student records.');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedSession, selectedClass, selectedSection, selectedCategory, selectedHouse, selectedStatus, selectedGender, page, error]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filteredSections = selectedClass
    ? sections.filter((s) => s.classId === selectedClass)
    : sections;

  const columns: Column<StudentListItem>[] = [
    {
      header: 'Admission #',
      accessorKey: 'admissionNo',
      cell: (row) => (
        <div className="font-mono font-bold text-xs text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded-md inline-block">
          {row.admissionNo}
        </div>
      ),
    },
    {
      header: 'Student Name',
      accessorKey: 'nameEn',
      cell: (row) => (
        <div>
          <div className="font-bold text-xs text-slate-900">{row.nameEn}</div>
          {row.fullNameUr && <div className="text-3xs text-slate-400 font-urdu">{row.fullNameUr}</div>}
        </div>
      ),
    },
    {
      header: 'Class & Section',
      accessorKey: 'currentEnrollment',
      cell: (row) =>
        row.currentEnrollment ? (
          <div className="text-xs">
            <span className="font-bold text-slate-800">{row.currentEnrollment.className}</span>
            <span className="text-slate-400 mx-1">-</span>
            <span className="text-slate-600 font-semibold">{row.currentEnrollment.sectionName}</span>
          </div>
        ) : (
          <span className="text-3xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Unassigned</span>
        ),
    },
    {
      header: 'Roll #',
      accessorKey: 'currentEnrollment',
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {row.currentEnrollment?.rollNumber || '—'}
        </span>
      ),
    },
    {
      header: 'Guardian / Father',
      accessorKey: 'guardianName',
      cell: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800">{row.guardianName || '—'}</div>
          {row.guardianPhone && <div className="text-3xs text-slate-400">{row.guardianPhone}</div>}
        </div>
      ),
    },
    {
      header: 'Gender',
      accessorKey: 'gender',
      cell: (row) => (
        <span className="text-2xs font-semibold text-slate-600 capitalize">
          {row.gender.toLowerCase()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'currentStatus',
      cell: (row) => {
        const isAct = row.currentStatus === 'ACTIVE';
        const isWith = row.currentStatus === 'WITHDRAWN';
        const isGrad = row.currentStatus === 'GRADUATED';
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider ${
              isAct
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isWith
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : isGrad
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {row.currentStatus}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Link href={`/admin/students/${row.id}`}>
            <Button variant="outline" size="sm" className="h-7 px-2 text-2xs">
              <Eye className="w-3.5 h-3.5 me-1 text-blue-600" />
              View 360
            </Button>
          </Link>
          <Link href={`/admin/students/${row.id}/edit`}>
            <Button variant="outline" size="sm" className="h-7 px-2 text-2xs">
              <Edit className="w-3.5 h-3.5 text-slate-600" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Total Registered</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-slate-900">{stats.total}</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-3xs font-bold uppercase tracking-wider text-emerald-600">Active Students</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-emerald-700">{stats.active}</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-3xs font-bold uppercase tracking-wider text-sky-600">Boys / Male</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-slate-900">{stats.male}</span>
            <span className="text-xs font-bold text-slate-400">
              {stats.active > 0 ? Math.round((stats.male / stats.active) * 100) : 0}%
            </span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-3xs font-bold uppercase tracking-wider text-pink-600">Girls / Female</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-slate-900">{stats.female}</span>
            <span className="text-xs font-bold text-slate-400">
              {stats.active > 0 ? Math.round((stats.female / stats.active) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        {/* Header & Main Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Student Directory & Profiles</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Browse, search, enroll, and manage student demographic records and academic histories.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/admin/students/bulk">
              <Button variant="outline" size="sm">
                <ArrowRightLeft className="w-3.5 h-3.5 me-1.5" />
                Bulk Operations
              </Button>
            </Link>
            <Link href="/admin/students/new">
              <Button variant="primary" size="sm">
                <UserPlus className="w-4 h-4 me-1.5" />
                Admit Student
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
          <Input
            placeholder="Search by name, adm #, father..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSection('');
              setPage(1);
            }}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value);
              setPage(1);
            }}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Sections</option>
            {filteredSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="GRADUATED">Graduated</option>
            <option value="LEFT">Left</option>
          </select>

          <select
            value={selectedGender}
            onChange={(e) => {
              setSelectedGender(e.target.value);
              setPage(1);
            }}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setSelectedClass('');
              setSelectedSection('');
              setSelectedCategory('');
              setSelectedHouse('');
              setSelectedStatus('');
              setSelectedGender('');
              setPage(1);
            }}
          >
            Clear Filters
          </Button>
        </div>

        {/* Students Data Table */}
        <DataTable
          columns={columns}
          data={students}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          emptyTitle="No students found"
          emptySubtitle="Try clearing filters or clicking 'Admit Student' to register your first student."
        />
      </div>
    </div>
  );
}
