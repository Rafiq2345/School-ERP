'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserPlus,
  Users,
  ArrowLeft,
  Calendar,
  Save,
  CheckCircle,
  Building,
  CreditCard,
  FileText,
  Search,
  GraduationCap,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { AIFormAnalyzerModal } from './AIFormAnalyzerModal';
import { DynamicCustomFieldsSection, CustomFieldItem } from './DynamicCustomFieldsSection';

interface StudentFormProps {
  initialStudentId?: string;
}

export function StudentFormView({ initialStudentId }: StudentFormProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Form Analyzer Modal State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [customFields, setCustomFields] = useState<CustomFieldItem[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // Dropdown master lists
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; classId: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [houses, setHouses] = useState<{ id: string; name: string }[]>([]);

  // Sibling search state
  const [guardianSearchQuery, setGuardianSearchQuery] = useState('');
  const [guardianResults, setGuardianResults] = useState<any[]>([]);
  const [selectedGuardian, setSelectedGuardian] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    admissionNo: '',
    admissionSessionId: '',
    classId: '',
    sectionId: '',
    rollNumber: '',
    admissionDate: new Date().toISOString().split('T')[0],
    categoryId: '',
    houseId: '',
    firstNameEn: '',
    lastNameEn: '',
    fullNameUr: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    dob: '2015-01-01',
    bloodGroup: 'UNKNOWN',
    religion: 'ISLAM',
    nationality: 'PAKISTANI',
    nationalId: '',
    photoUrl: '',
    primaryContactPhone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    currentAddressEn: '',
    currentAddressUr: '',
    permanentAddressEn: '',
    city: 'Karachi',
    // Parent / Guardian
    guardianName: '',
    guardianUrduName: '',
    guardianCnic: '',
    guardianRelation: 'FATHER' as 'FATHER' | 'MOTHER' | 'GUARDIAN',
    guardianPhone: '',
    guardianEmail: '',
    guardianOccupation: '',
    guardianIncome: '',
    // Previous school
    previousSchoolName: '',
    previousSchoolClass: '',
    previousSchoolSlcNo: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load Custom Fields
  const fetchCustomFields = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/students/custom-fields');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCustomFields(json.data);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    fetchCustomFields();
  }, [fetchCustomFields]);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [sessRes, clsRes, secRes, catRes] = await Promise.all([
          fetch('/api/admin/config/sessions').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
          fetch('/api/admin/config/classes').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
          fetch('/api/admin/config/sections').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
          fetch('/api/admin/config/class-categories').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        ]);

        if (sessRes.success && Array.isArray(sessRes.data)) {
          setSessions(sessRes.data);
          if (sessRes.data.length > 0) {
            setFormData((prev) => ({ ...prev, admissionSessionId: sessRes.data[0].id }));
          }
        }
        if (clsRes.success && Array.isArray(clsRes.data)) setClasses(clsRes.data);
        if (secRes.success && Array.isArray(secRes.data)) setSections(secRes.data);
        if (catRes.success && Array.isArray(catRes.data)) setCategories(catRes.data);
      } catch {
        // Non-blocking
      }
    }
    loadMasters();
  }, []);

  const handleGuardianSearch = async (query: string) => {
    setGuardianSearchQuery(query);
    if (query.trim().length >= 3) {
      try {
        const res = await fetch(`/api/admin/students/guardians?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.success) setGuardianResults(json.data);
      } catch {
        // Fallback
      }
    } else {
      setGuardianResults([]);
    }
  };

  const handleSelectExistingGuardian = (g: any) => {
    setSelectedGuardian(g);
    setFormData((prev) => ({
      ...prev,
      guardianName: g.fullNameEn,
      guardianUrduName: g.fullNameUr || '',
      guardianCnic: g.nationalId || '',
      guardianRelation: g.relationshipType || 'FATHER',
      guardianPhone: g.primaryPhone,
      guardianEmail: g.email || '',
      guardianOccupation: g.occupation || '',
      guardianIncome: g.annualIncome ? String(g.annualIncome) : '',
    }));
    setGuardianResults([]);
  };

  const filteredSections = formData.classId
    ? sections.filter((s) => s.classId === formData.classId)
    : sections;

  const handleCustomFieldChange = (key: string, val: any) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.firstNameEn.trim()) errors.firstNameEn = 'Student First Name is required.';
    if (!formData.admissionSessionId) errors.admissionSessionId = 'Academic Session is required.';
    if (!formData.classId) errors.classId = 'Class is required.';
    if (!formData.sectionId) errors.sectionId = 'Section is required.';
    if (!formData.dob) errors.dob = 'Date of birth is required.';
    if (!formData.guardianPhone && !selectedGuardian) {
      errors.guardianPhone = 'Parent / Guardian contact phone is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      error('Validation Error', 'Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        admissionNo: formData.admissionNo.trim() || undefined,
        admissionSessionId: formData.admissionSessionId,
        classId: formData.classId,
        sectionId: formData.sectionId,
        rollNumber: formData.rollNumber.trim() || undefined,
        admissionDate: formData.admissionDate,
        categoryId: formData.categoryId || undefined,
        houseId: formData.houseId || undefined,
        firstNameEn: formData.firstNameEn.trim(),
        lastNameEn: formData.lastNameEn.trim() || undefined,
        fullNameUr: formData.fullNameUr.trim() || undefined,
        gender: formData.gender,
        dob: formData.dob,
        bloodGroup: formData.bloodGroup,
        religion: formData.religion,
        nationality: formData.nationality,
        nationalId: formData.nationalId.trim() || undefined,
        photoUrl: formData.photoUrl.trim() || undefined,
        primaryContactPhone: formData.primaryContactPhone.trim() || formData.guardianPhone.trim(),
        emergencyContactName: formData.emergencyContactName.trim() || undefined,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
        currentAddressEn: formData.currentAddressEn.trim() || undefined,
        currentAddressUr: formData.currentAddressUr.trim() || undefined,
        permanentAddressEn: formData.permanentAddressEn.trim() || undefined,
        city: formData.city.trim() || 'Karachi',
        customFieldValues: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
      };

      if (selectedGuardian) {
        payload.existingGuardianId = selectedGuardian.id;
      } else if (formData.guardianName.trim() || formData.guardianPhone.trim()) {
        payload.guardian = {
          fullNameEn: formData.guardianName.trim() || 'Guardian',
          fullNameUr: formData.guardianUrduName.trim() || undefined,
          nationalId: formData.guardianCnic.trim() || undefined,
          relationshipType: formData.guardianRelation,
          occupation: formData.guardianOccupation.trim() || undefined,
          primaryPhone: formData.guardianPhone.trim(),
          email: formData.guardianEmail.trim() || undefined,
          annualIncome: formData.guardianIncome ? Number(formData.guardianIncome) : undefined,
        };
      }

      if (formData.previousSchoolName.trim()) {
        payload.previousSchool = {
          schoolName: formData.previousSchoolName.trim(),
          lastClassPassed: formData.previousSchoolClass.trim() || 'Primary',
          slcNumber: formData.previousSchoolSlcNo.trim() || undefined,
        };
      }

      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        success('Student Admitted Successfully', `Student ${json.data.firstNameEn} has been enrolled.`);
        router.push(`/admin/students/${json.data.id}`);
      } else {
        error('Admission Failed', json.error?.message || 'Could not register student.');
      }
    } catch {
      error('Network Error', 'Failed to connect to student admission service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/students">
              <Button variant="outline" size="sm" type="button">
                <ArrowLeft className="w-4 h-4 me-1" />
                Back to Directory
              </Button>
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900">Student Admission & Enrollment</h1>
              <p className="text-xs text-slate-500 mt-0.5">Register a new student, assign classroom placement, and link family members.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setIsAIModalOpen(true)}
              className="bg-blue-50/70 border-blue-200 text-blue-700 hover:bg-blue-100/70 shadow-xs font-bold"
            >
              <Sparkles className="w-4 h-4 me-1.5 text-blue-600 animate-pulse" />
              Upload Existing School Form (AI Assistant)
            </Button>

            <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
              <Save className="w-4 h-4 me-1.5" />
              Save & Enroll Student
            </Button>
          </div>
        </div>

        {/* 1. Academic Placement */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">1. Academic Placement</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsAIModalOpen(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Configure Custom Fields with AI Form Analyzer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Academic Session *</label>
              <select
                value={formData.admissionSessionId}
                onChange={(e) => setFormData({ ...formData, admissionSessionId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {formErrors.admissionSessionId && (
                <p className="text-3xs text-rose-600 mt-1">{formErrors.admissionSessionId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Class / Grade *</label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value, sectionId: '' })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {formErrors.classId && <p className="text-3xs text-rose-600 mt-1">{formErrors.classId}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Section *</label>
              <select
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select Section</option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {formErrors.sectionId && <p className="text-3xs text-rose-600 mt-1">{formErrors.sectionId}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Class Roll Number"
              placeholder="e.g. 15"
              value={formData.rollNumber}
              onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
            />
            <Input
              label="Admission Date"
              type="date"
              value={formData.admissionDate}
              onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
            />
            <Input
              label="Admission # (Leave blank for auto-generate)"
              placeholder="Auto: ADM-1001"
              value={formData.admissionNo}
              onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
            />
          </div>
        </div>

        {/* 2. Personal Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">2. Student Personal & Demographic Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="First Name (English) *"
              placeholder="Muhammad"
              value={formData.firstNameEn}
              onChange={(e) => setFormData({ ...formData, firstNameEn: e.target.value })}
              error={formErrors.firstNameEn}
            />
            <Input
              label="Last Name (English)"
              placeholder="Ali"
              value={formData.lastNameEn}
              onChange={(e) => setFormData({ ...formData, lastNameEn: e.target.value })}
            />
            <Input
              label="Full Name (Urdu)"
              placeholder="محمد علی"
              value={formData.fullNameUr}
              onChange={(e) => setFormData({ ...formData, fullNameUr: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <Input
              label="Date of Birth *"
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              error={formErrors.dob}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="UNKNOWN">Unknown / Not Tested</option>
                <option value="A_POS">A+</option>
                <option value="A_NEG">A-</option>
                <option value="B_POS">B+</option>
                <option value="B_NEG">B-</option>
                <option value="O_POS">O+</option>
                <option value="O_NEG">O-</option>
                <option value="AB_POS">AB+</option>
                <option value="AB_NEG">AB-</option>
              </select>
            </div>

            <Input
              label="B-Form / CNIC #"
              placeholder="42101-1234567-1"
              value={formData.nationalId}
              onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
            />
          </div>
        </div>

        {/* 3. Family & Sibling Linkage */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">3. Parent / Guardian & Sibling Linkage</h2>
            </div>
            {selectedGuardian && (
              <span className="text-2xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                Linked to Existing Family: {selectedGuardian.fullNameEn}
              </span>
            )}
          </div>

          {/* Live Search to link existing sibling/guardian */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">Link to Existing Parent / Siblings:</span>
            <div className="flex gap-2">
              <Input
                placeholder="Search parent by CNIC, phone number, or name..."
                value={guardianSearchQuery}
                onChange={(e) => handleGuardianSearch(e.target.value)}
              />
              {selectedGuardian && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setSelectedGuardian(null);
                    setFormData((prev) => ({
                      ...prev,
                      guardianName: '',
                      guardianPhone: '',
                      guardianCnic: '',
                    }));
                  }}
                >
                  Clear Link
                </Button>
              )}
            </div>

            {guardianResults.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-2 space-y-1 shadow-sm max-h-48 overflow-y-auto">
                {guardianResults.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => handleSelectExistingGuardian(g)}
                    className="p-2 hover:bg-blue-50 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{g.fullNameEn}</span>
                      <span className="text-slate-400 ms-2">({g.primaryPhone})</span>
                      {g.nationalId && <span className="text-slate-400 ms-2 font-mono">CNIC: {g.nationalId}</span>}
                    </div>
                    <span className="text-3xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                      {g.students.length} Sibling(s) Enrolled
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Father / Guardian Name *"
              placeholder="Tariq Mahmood"
              value={formData.guardianName}
              onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
            />
            <Input
              label="Father / Guardian Phone *"
              placeholder="0300-1234567"
              value={formData.guardianPhone}
              onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
              error={formErrors.guardianPhone}
            />
            <Input
              label="Guardian CNIC #"
              placeholder="42101-9876543-1"
              value={formData.guardianCnic}
              onChange={(e) => setFormData({ ...formData, guardianCnic: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Occupation"
              placeholder="Business / Engineer"
              value={formData.guardianOccupation}
              onChange={(e) => setFormData({ ...formData, guardianOccupation: e.target.value })}
            />
            <Input
              label="Annual Income (PKR)"
              placeholder="e.g. 1200000"
              value={formData.guardianIncome}
              onChange={(e) => setFormData({ ...formData, guardianIncome: e.target.value })}
            />
            <Input
              label="Email Address"
              placeholder="parent@gmail.com"
              value={formData.guardianEmail}
              onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
            />
          </div>
        </div>

        {/* 4. Contact & Address */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900">4. Contact & Residential Address</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Emergency Contact Name"
              placeholder="Uncle / Mother Name"
              value={formData.emergencyContactName}
              onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
            />
            <Input
              label="Emergency Contact Phone"
              placeholder="0321-9876543"
              value={formData.emergencyContactPhone}
              onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
            />
            <Input
              label="City"
              placeholder="Karachi"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <Input
            label="Current Residential Address"
            placeholder="House # 123, Street 4, Sector 5..."
            value={formData.currentAddressEn}
            onChange={(e) => setFormData({ ...formData, currentAddressEn: e.target.value })}
          />
        </div>

        {/* 5. Dynamic Custom Fields Section (Loaded from CustomFieldDefinitions) */}
        <DynamicCustomFieldsSection
          customFields={customFields}
          values={customFieldValues}
          onChange={handleCustomFieldChange}
        />

        {/* 6. Previous School Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">6. Previous School Information (Optional)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Previous School Name"
              placeholder="St. Paul Academy"
              value={formData.previousSchoolName}
              onChange={(e) => setFormData({ ...formData, previousSchoolName: e.target.value })}
            />
            <Input
              label="Last Class Passed"
              placeholder="Class 4"
              value={formData.previousSchoolClass}
              onChange={(e) => setFormData({ ...formData, previousSchoolClass: e.target.value })}
            />
            <Input
              label="School Leaving Certificate (SLC) #"
              placeholder="SLC-2026-981"
              value={formData.previousSchoolSlcNo}
              onChange={(e) => setFormData({ ...formData, previousSchoolSlcNo: e.target.value })}
            />
          </div>
        </div>
      </form>

      {/* AI Form Analyzer Modal */}
      <AIFormAnalyzerModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onFieldsApproved={fetchCustomFields}
      />
    </>
  );
}
