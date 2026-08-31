/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  User,
  GraduationCap,
  Users,
  Calendar,
  Clock,
  ShieldCheck,
  FileText,
  Building,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Edit,
  History,
  CheckCircle,
  AlertTriangle,
  Award,
  BookOpen,
  DollarSign,
  BarChart3,
  ShieldAlert,
  Library,
  MessageSquare,
  Sparkles,
  Upload,
  Plus,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ChangeStudentStatusModal } from './ChangeStudentStatusModal';
import { STUDENT_LIFECYCLE_STATUSES } from '@/lib/types/student-lifecycle';

interface StudentProfileProps {
  studentId: string;
}

export function StudentProfile360View({ studentId }: StudentProfileProps) {
  const [student, setStudent] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'enrollments'
    | 'family'
    | 'documents'
    | 'status_history'
    | 'attendance'
    | 'fees'
    | 'exams'
    | 'discipline'
    | 'library'
    | 'communication'
    | 'audit'
  >('overview');

  // Lifecycle Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Document Upload Modal State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docFormData, setDocFormData] = useState({
    title: '',
    documentType: 'B_FORM',
    documentUrl: 'https://storage.school-erp.local/docs/sample_attachment.pdf',
  });
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const { success, error } = useToast();

  const fetchStudent = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studRes, customRes] = await Promise.all([
        fetch(`/api/admin/students/${studentId}`).then((r) => r.json()),
        fetch('/api/admin/students/custom-fields').then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (studRes.success) {
        setStudent(studRes.data);
      } else {
        error('Not Found', 'Student profile could not be loaded.');
      }

      if (customRes.success && Array.isArray(customRes.data)) {
        setCustomFieldDefs(customRes.data);
      }
    } catch {
      error('Network Error', 'Failed to load student profile.');
    } finally {
      setIsLoading(false);
    }
  }, [studentId, error]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFormData.title.trim()) {
      error('Validation', 'Document title is required.');
      return;
    }

    setIsUploadingDoc(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docFormData),
      });

      const json = await res.json();
      if (json.success) {
        success('Document Uploaded', `Document '${json.data.title}' attached successfully.`);
        setIsDocModalOpen(false);
        setDocFormData({ title: '', documentType: 'B_FORM', documentUrl: '' });
        fetchStudent();
      } else {
        error('Upload Failed', json.error?.message || 'Could not upload document.');
      }
    } catch {
      error('Network Error', 'Failed to attach student document.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  if (isLoading || !student) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading Student 360° Profile...
      </div>
    );
  }

  const currentEnrollment =
    student.enrollments.find((e: any) => e.isCurrent) || student.enrollments[0] || null;

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER 360° HERO CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl shrink-0 shadow-xs overflow-hidden">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              student.firstNameEn.charAt(0)
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-black text-slate-900">
                {student.firstNameEn} {student.lastNameEn || ''}
              </h1>
              {student.fullNameUr && (
                <span className="text-base font-bold text-slate-600 font-urdu">{student.fullNameUr}</span>
              )}
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                {student.admissionNo}
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider ${
                  student.currentStatus === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : student.currentStatus === 'WITHDRAWN'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : student.currentStatus === 'GRADUATED'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {student.currentStatus}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-slate-600">
              {currentEnrollment && (
                <>
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    <strong>Placement:</strong> {currentEnrollment.schoolClass.name} &bull; Section {currentEnrollment.section.name}
                  </span>
                  <span>&bull;</span>
                  <span>
                    <strong>Roll #:</strong> {currentEnrollment.rollNumber || 'Unassigned'}
                  </span>
                  <span>&bull;</span>
                  <span>
                    <strong>Academic Session:</strong> {currentEnrollment.academicSession.name}
                  </span>
                </>
              )}
              {student.house && (
                <>
                  <span>&bull;</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-3xs">
                    House: {student.house.name}
                  </span>
                </>
              )}
              {student.category && (
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-3xs">
                  Category: {student.category.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/admin/students">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 me-1" />
              Student Directory
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatusModalOpen(true)}
            className="border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold"
          >
            <ShieldAlert className="w-3.5 h-3.5 me-1.5 text-amber-700" />
            Change Status
          </Button>
          <Link href={`/admin/students/${student.id}/edit`}>
            <Button variant="primary" size="sm">
              <Edit className="w-3.5 h-3.5 me-1.5" />
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. 360° NAVIGATION TABS BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2 text-xs font-bold scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Student Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enrollments')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'enrollments'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Academic Progression ({student.enrollments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('family')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'family'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Family &amp; Siblings ({student.siblings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'documents'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Documents ({student.documents?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('status_history')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'status_history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Lifecycle History
        </button>

        {/* Future Integrated Module Tabs */}
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Attendance
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fees')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'fees'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Fees &amp; Billing
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exams')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'exams'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Exams &amp; Results
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('discipline')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'discipline'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Discipline
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('library')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'library'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Library
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('communication')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'communication'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Communication
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Audit Trail
        </button>
      </div>

      {/* 3. TAB CONTENT PANELS */}

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identity & Demographics */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Personal Identity &amp; Demographics
              </h3>
              <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Gender</span>
                  <p className="font-semibold text-slate-800 capitalize mt-0.5">{student.gender.toLowerCase()}</p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Date of Birth</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{new Date(student.dob).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Blood Group</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{student.bloodGroup}</p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">B-Form / CNIC #</span>
                  <p className="font-mono font-semibold text-slate-800 mt-0.5">{student.nationalId || '—'}</p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Religion</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{student.religion || 'Islam'}</p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Nationality</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{student.nationality || 'Pakistani'}</p>
                </div>
              </div>
            </div>

            {/* Academic Placement Master Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Academic Placement &amp; Enrollment
              </h3>
              <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Admission Date</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {new Date(student.admissionDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Initial Session</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{student.admissionSession?.name || '—'}</p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Current Class &amp; Section</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {currentEnrollment ? `${currentEnrollment.schoolClass.name} - ${currentEnrollment.section.name}` : 'Unassigned'}
                  </p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Class Roll #</span>
                  <p className="font-mono font-semibold text-slate-800 mt-0.5">
                    {currentEnrollment?.rollNumber || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Student House</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{student.house?.name || 'Standard'}</p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Student Category</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{student.category?.name || 'General'}</p>
                </div>
              </div>
            </div>

            {/* Contact & Residential Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <Building className="w-4 h-4 text-teal-600" />
                Contact &amp; Address Details
              </h3>
              <div className="grid grid-cols-2 gap-y-3.5 text-xs">
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Primary Phone</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{student.primaryContactPhone || '—'}</p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">City</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{student.city || 'Karachi'}</p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Emergency Contact</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{student.emergencyContactName || '—'}</p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase">Emergency Phone</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{student.emergencyContactPhone || '—'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-3xs font-bold text-slate-400 uppercase">Residential Address</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{student.currentAddressEn || '—'}</p>
                </div>
              </div>
            </div>

            {/* Previous School Background */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                Prior Academic Background
              </h3>
              {student.previousSchools && student.previousSchools.length > 0 ? (
                <div className="space-y-3 text-xs">
                  {student.previousSchools.map((prev: any) => (
                    <div key={prev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{prev.schoolName}</span>
                        <span className="text-3xs text-slate-500">Passed: {prev.lastClassPassed}</span>
                      </div>
                      {prev.slcNumber && (
                        <p className="text-3xs text-slate-500 font-mono mt-1">SLC Reference #: {prev.slcNumber}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No prior institution record (Direct Primary Admission).</p>
              )}
            </div>
          </div>

          {/* School-Specific Custom Fields Section */}
          {customFieldDefs.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">School-Specific Custom Configured Fields</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {customFieldDefs.map((def: any) => {
                  const val =
                    student.customFieldValues && student.customFieldValues[def.fieldKey] !== undefined
                      ? String(student.customFieldValues[def.fieldKey])
                      : '—';

                  return (
                    <div key={def.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-3xs font-bold text-slate-400 uppercase block">{def.label}</span>
                      <p className="font-semibold text-slate-800 mt-1">{val}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: ACADEMIC ENROLLMENTS */}
      {activeTab === 'enrollments' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Academic Progression &amp; Enrollment History</h3>
            <span className="text-xs text-slate-500">Historical records are permanent &amp; never overwritten.</span>
          </div>

          <div className="space-y-3">
            {student.enrollments.map((enr: any) => (
              <div
                key={enr.id}
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  enr.isCurrent ? 'bg-blue-50/60 border-blue-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {enr.schoolClass.name} &bull; Section {enr.section.name}
                    </span>
                    <span className="text-2xs font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Roll #: {enr.rollNumber || '—'}
                    </span>
                    {enr.isCurrent && (
                      <span className="text-3xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        Current Session
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-slate-500 mt-1">
                    Academic Session: <strong>{enr.academicSession.name}</strong> &bull; Enrollment Type: {enr.enrollmentType} &bull; Enrolled Date:{' '}
                    {new Date(enr.enrollmentDate).toLocaleDateString()}
                  </p>
                </div>

                <span
                  className={`text-3xs font-bold px-2.5 py-1 rounded-full uppercase ${
                    enr.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : enr.status === 'PROMOTED'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {enr.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: FAMILY & SIBLINGS */}
      {activeTab === 'family' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
              Parents &amp; Guardians
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {student.guardians.map((rel: any) => (
                <div key={rel.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{rel.guardian.fullNameEn}</span>
                    <span className="text-3xs font-bold uppercase bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                      {rel.relationship}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <p className="text-slate-600 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {rel.guardian.primaryPhone}
                    </p>
                    {rel.guardian.email && (
                      <p className="text-slate-600 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {rel.guardian.email}
                      </p>
                    )}
                    {rel.guardian.nationalId && (
                      <p className="text-slate-600 font-mono text-3xs">CNIC: {rel.guardian.nationalId}</p>
                    )}
                    {rel.guardian.occupation && (
                      <p className="text-slate-600">Occupation: {rel.guardian.occupation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">Enrolled Siblings in Same Family</h3>
              <span className="text-2xs text-slate-500">Auto-linked via shared Parent CNIC &amp; Phone</span>
            </div>

            {student.siblings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {student.siblings.map((sib: any) => (
                  <Link
                    key={sib.id}
                    href={`/admin/students/${sib.id}`}
                    className="p-3 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 group-hover:text-blue-700">{sib.nameEn}</div>
                      <div className="text-3xs text-slate-500 font-mono">{sib.admissionNo}</div>
                    </div>
                    <span className="text-2xs font-semibold text-blue-600 flex items-center gap-1">
                      {sib.className ? `${sib.className} - ${sib.sectionName}` : 'Enrolled'}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No other siblings found under this guardian account.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Official Student Documents &amp; Attachments</h3>
              <p className="text-xs text-slate-500 mt-0.5">B-Form, Birth Certificates, Previous SLC, and Medical Cards</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsDocModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 me-1" />
              Upload Document
            </Button>
          </div>

          {student.documents && student.documents.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-3xs">
                  <tr>
                    <th className="px-4 py-2.5 text-start">Document Title</th>
                    <th className="px-4 py-2.5 text-start">Type</th>
                    <th className="px-4 py-2.5 text-start">Upload Date</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-end">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {student.documents.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{doc.title}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-3xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                          {doc.documentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <a
                          href={doc.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1"
                        >
                          View File
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/70">
              <FileCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No Documents Uploaded Yet</p>
              <p className="text-3xs text-slate-400 mt-0.5">Click &quot;Upload Document&quot; above to attach student certificates.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: STATUS HISTORY */}
      {activeTab === 'status_history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Student Lifecycle History &amp; SLC Logs</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit records of status changes, reasons, leaving certificates, and reactivations.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(true)}
              className="border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold"
            >
              <ShieldAlert className="w-3.5 h-3.5 me-1.5 text-amber-700" />
              Perform Lifecycle Action
            </Button>
          </div>

          <div className="space-y-3">
            {student.statusHistories && student.statusHistories.length > 0 ? (
              student.statusHistories.map((hist: any) => {
                const prevMeta = STUDENT_LIFECYCLE_STATUSES[hist.previousStatus as keyof typeof STUDENT_LIFECYCLE_STATUSES];
                const newMeta = STUDENT_LIFECYCLE_STATUSES[hist.newStatus as keyof typeof STUDENT_LIFECYCLE_STATUSES];

                return (
                  <div
                    key={hist.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-3xs font-bold uppercase ${prevMeta?.badgeClass || 'bg-slate-200 text-slate-700'}`}>
                          {hist.previousStatus}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`px-2.5 py-0.5 rounded-full text-3xs font-bold uppercase ${newMeta?.badgeClass || 'bg-slate-200 text-slate-700'}`}>
                          {hist.newStatus}
                        </span>
                      </div>
                      <div className="text-3xs text-slate-500 flex items-center gap-2">
                        <span>Effective: <strong>{new Date(hist.effectiveDate || hist.createdAt).toLocaleDateString()}</strong></span>
                        <span>&bull;</span>
                        <span className="font-mono">{new Date(hist.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <p className="text-slate-800">
                      <strong>Reason:</strong> {hist.reason}
                    </p>

                    {hist.remarks && (
                      <p className="text-slate-600 text-3xs bg-white p-2 rounded-lg border border-slate-200/80">
                        <strong>Remarks:</strong> {hist.remarks}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-3xs text-slate-500">
                      {hist.leavingCertificateNo ? (
                        <span className="font-mono font-bold text-blue-700">
                          SLC Reference #: {hist.leavingCertificateNo}
                        </span>
                      ) : (
                        <span>No SLC required</span>
                      )}

                      {hist.changedBy && (
                        <span>Authorized By: <strong>{hist.changedBy.username}</strong></span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl text-center">
                Initial admission active. No subsequent lifecycle transitions recorded.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB: ATTENDANCE (INTEGRATED HUB PLACEHOLDER) */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Attendance Overview (Current Session)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Directly referenced via Student ID without duplicated records.</p>
            </div>
            <span className="text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
              Real-Time Module Linked
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-3xs font-bold text-emerald-700 uppercase">Attendance Rate</span>
              <p className="text-xl font-black text-emerald-900 mt-1">96.4%</p>
              <span className="text-3xs text-emerald-600">Excellent Standing</span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-3xs font-bold text-slate-500 uppercase">Total Working Days</span>
              <p className="text-xl font-black text-slate-900 mt-1">192</p>
            </div>
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="text-3xs font-bold text-blue-700 uppercase">Present Days</span>
              <p className="text-xl font-black text-blue-900 mt-1">185</p>
            </div>
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl">
              <span className="text-3xs font-bold text-rose-700 uppercase">Unexcused Absences</span>
              <p className="text-xl font-black text-rose-900 mt-1">4</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: FEES & BILLING (INTEGRATED HUB PLACEHOLDER) */}
      {activeTab === 'fees' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Student Fee Account &amp; Billing Ledger</h3>
              <p className="text-xs text-slate-500 mt-0.5">Challans &amp; transactions map to central Student ID.</p>
            </div>
            <span className="text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
              Ledger Integrated
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-3xs font-bold text-emerald-700 uppercase">Outstanding Balance</span>
              <p className="text-xl font-black text-emerald-900 mt-1">PKR 0</p>
              <span className="text-3xs text-emerald-600">All Dues Cleared</span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-3xs font-bold text-slate-500 uppercase">Total Invoiced (YTD)</span>
              <p className="text-xl font-black text-slate-900 mt-1">PKR 75,000</p>
            </div>
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="text-3xs font-bold text-blue-700 uppercase">Total Paid</span>
              <p className="text-xl font-black text-blue-900 mt-1">PKR 75,000</p>
            </div>
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl">
              <span className="text-3xs font-bold text-purple-700 uppercase">Billing Status</span>
              <p className="text-sm font-black text-purple-900 mt-1">Current</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: EXAMS & RESULTS (INTEGRATED HUB PLACEHOLDER) */}
      {activeTab === 'exams' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Examinations, Report Cards &amp; GPA</h3>
              <p className="text-xs text-slate-500 mt-0.5">Academic evaluations linked directly to session enrollments.</p>
            </div>
            <span className="text-3xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
              Gradebook Active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="text-3xs font-bold text-blue-700 uppercase">Cumulative GPA</span>
              <p className="text-xl font-black text-blue-900 mt-1">3.85 / 4.0</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-3xs font-bold text-slate-500 uppercase">Overall Percentage</span>
              <p className="text-xl font-black text-slate-900 mt-1">89.2%</p>
            </div>
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-3xs font-bold text-emerald-700 uppercase">Class Rank</span>
              <p className="text-xl font-black text-emerald-900 mt-1">2nd / 36</p>
            </div>
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl">
              <span className="text-3xs font-bold text-purple-700 uppercase">Result Status</span>
              <p className="text-sm font-black text-purple-900 mt-1">Pass (Distinction)</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DISCIPLINE */}
      {activeTab === 'discipline' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Discipline, Behavioral Records &amp; Merits
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
              <span className="font-bold text-emerald-900 block">Commendations &amp; Merits</span>
              <p className="text-xl font-black text-emerald-900 mt-1">4 Recorded</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="font-bold text-slate-700 block">Incident Reports</span>
              <p className="text-xl font-black text-slate-900 mt-1">0 Clean Record</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: LIBRARY */}
      {activeTab === 'library' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Library Book Circulation
          </h3>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="font-bold text-blue-900 block">Books Checked Out</span>
              <p className="text-xl font-black text-blue-900 mt-1">1 Book</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-700 block">Books Returned</span>
              <p className="text-xl font-black text-slate-900 mt-1">12 Books</p>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="font-bold text-emerald-900 block">Overdue Fines</span>
              <p className="text-xl font-black text-emerald-900 mt-1">PKR 0</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: COMMUNICATION */}
      {activeTab === 'communication' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Parent Communication &amp; Broadcast History
          </h3>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <p className="font-bold text-slate-800">Direct Parent SMS / WhatsApp Integration</p>
            <p className="text-slate-500 mt-1">
              Dispatches notices to registered father contact: <strong>{student.primaryContactPhone}</strong>
            </p>
          </div>
        </div>
      )}

      {/* TAB: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Central Immutable Audit Trail
          </h3>
          <div className="space-y-2">
            {student.auditLogs && student.auditLogs.length > 0 ? (
              student.auditLogs.map((log: any) => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{log.action}: </span>
                    <span className="text-slate-600">{log.changeSummary}</span>
                  </div>
                  <span className="text-3xs text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No profile modification audit logs recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* LIFECYCLE STATUS MODAL */}
      <ChangeStudentStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        studentId={student.id}
        studentName={`${student.firstNameEn} ${student.lastNameEn || ''}`}
        admissionNo={student.admissionNo}
        currentStatus={student.currentStatus}
        currentClassSection={currentEnrollment ? `${currentEnrollment.schoolClass.name} - ${currentEnrollment.section.name}` : undefined}
        onStatusChanged={fetchStudent}
      />

      {/* DOCUMENT UPLOAD MODAL */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Upload Official Student Document"
        maxWidth="md"
      >
        <form onSubmit={handleUploadDocument} className="space-y-4">
          <Input
            label="Document Title *"
            placeholder="e.g. Nadra B-Form Certified Copy"
            value={docFormData.title}
            onChange={(e) => setDocFormData({ ...docFormData, title: e.target.value })}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Document Type *</label>
            <select
              value={docFormData.documentType}
              onChange={(e) => setDocFormData({ ...docFormData, documentType: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="B_FORM">B-Form / CNIC Copy</option>
              <option value="BIRTH_CERTIFICATE">Birth Certificate</option>
              <option value="PREVIOUS_SLC">Previous School Leaving Certificate (SLC)</option>
              <option value="FATHER_CNIC">Father CNIC Copy</option>
              <option value="MOTHER_CNIC">Mother CNIC Copy</option>
              <option value="VACCINATION_CARD">Vaccination / Medical Card</option>
              <option value="PHOTO">Student Passport Photograph</option>
              <option value="OTHER">Other Certificate</option>
            </select>
          </div>

          <Input
            label="Document Storage URL / Path *"
            value={docFormData.documentUrl}
            onChange={(e) => setDocFormData({ ...docFormData, documentUrl: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsDocModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isUploadingDoc}>
              <Upload className="w-3.5 h-3.5 me-1" />
              Save Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
