'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Building,
  School,
  Globe,
  MapPin,
  Layers,
  Calendar,
  CalendarOff,
  GraduationCap,
  LayoutGrid,
  BookOpen,
  Network,
  Shield,
  ShieldCheck,
  CreditCard,
  Coins,
  Receipt,
  Percent,
  Clock,
  Users,
  UserCheck,
  UserPlus,
  FileText,
  FileCheck,
  Sliders,
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Upload,
  Printer,
  Package,
  Library,
  Briefcase,
  Key,
  FolderTree,
  Tag,
  DollarSign,
  Wallet,
  Landmark,
  Compass,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  Award,
  Bell,
  MessageSquare,
  FileCode2,
  X,
  Plus,
  ChevronDown,
  Cpu,
  Smartphone,
  Radio,
  ScanFace,
  Server,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Hierarchy Node Definition
interface OrgHierarchyNode {
  level: string;
  name: string;
  code?: string;
  type: string;
  icon: React.ReactNode;
  isRootContext?: boolean;
}

const DEFAULT_HIERARCHY: OrgHierarchyNode[] = [
  { level: 'Organization', name: 'Al-Falah Educational Network', code: 'ORG-ROOT', type: 'Parent Trust (Super-Admin Context)', icon: <Globe className="w-4 h-4 text-blue-600" />, isRootContext: true },
  { level: 'Head Office', name: 'Karachi Head Office', code: 'HO-KHI', type: 'Executive Administration', icon: <Building2 className="w-4 h-4 text-indigo-600" /> },
  { level: 'Region', name: 'Karachi Region', code: 'REG-KHI', type: 'Regional Directorate', icon: <Compass className="w-4 h-4 text-sky-600" /> },
  { level: 'Zone / Area', name: 'North Zone', code: 'ZN-NORTH', type: 'Cluster Administration (Optional)', icon: <MapPin className="w-4 h-4 text-emerald-600" /> },
  { level: 'Branch / School', name: 'North Campus 1 (SCH-001)', code: 'SCH-001', type: 'Active Institution', icon: <School className="w-4 h-4 text-amber-600" /> },
];

// Configuration Card Definition
interface ConfigCard {
  id: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
  badgeType?: 'default' | 'success' | 'warning' | 'info';
  params?: string[];
  icon?: React.ReactNode;
}

// Configuration Tab Definition
interface ConfigTab {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
  cards: ConfigCard[];
}

const CONFIG_TABS: ConfigTab[] = [
  // 1. ORGANIZATION & SCHOOL (DEFAULT)
  {
    id: 'org-school',
    label: 'Organization & School',
    shortLabel: 'Org & School',
    icon: <Building2 className="w-4 h-4" />,
    description: 'Operational structure, administrative secretariats, branches, campus profiles, sessions & branch preferences.',
    cards: [
      {
        id: 'head-offices',
        title: 'Head Offices',
        description: 'Add and manage Head Offices, executive secretariat units, central governance and administrative leadership.',
        href: '/admin/settings/profile',
        badge: '1 Configured',
        badgeType: 'info',
        params: ['HO Code: HO-KHI', 'Secretariat Address', 'Director General Desk', 'Central Dispatch'],
        icon: <Building2 className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'regions',
        title: 'Regions & Directorates',
        description: 'Create and manage geographic administrative divisions and regional directorates under relevant Head Offices.',
        href: '/admin/settings/profile',
        badge: '2 Regions Active',
        badgeType: 'default',
        params: ['Region Code', 'Regional Director', 'Coverage Districts', 'Regional Secretariat'],
        icon: <Compass className="w-4 h-4 text-sky-600" />,
      },
      {
        id: 'zones',
        title: 'Zones & Areas (Optional)',
        description: 'Configure optional cluster areas under regions (e.g. North, South, East, West clusters) for grouping nearby campuses.',
        href: '/admin/settings/profile',
        badge: 'Flexible Structure',
        badgeType: 'default',
        params: ['Zone Code', 'Area Manager Desk', 'Cluster Schools (4)', 'Geographic Boundaries'],
        icon: <MapPin className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'branches',
        title: 'Branches & Campuses Registry',
        description: 'Register and manage institutional schools/campuses under the appropriate Region/Zone with facility specifications.',
        href: '/admin/settings/profile',
        badge: '1 Active Campus',
        badgeType: 'success',
        params: ['Branch Code: SCH-001', 'Campus Type: Co-Ed', 'Shift Model: Morning', 'Capacity: 1,200'],
        icon: <School className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'school-info',
        title: 'School / Branch Information',
        description: 'Configure branch-specific details: bilingual name, school code, registration info, address, contact, timezone (Asia/Karachi) & principal.',
        href: '/admin/settings/profile',
        badge: 'SCH-001 (Active)',
        badgeType: 'success',
        params: ['Bilingual Title (EN/UR)', 'Timezone: Asia/Karachi', 'Currency: PKR (Rs)', 'Principal Office'],
        icon: <Building className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'academic-sessions',
        title: 'Academic Year & Sessions',
        description: 'Manage academic years, session lifecycle, active session (2026-2027), term date boundaries & promotion cutoff defaults.',
        href: '/admin/settings/academic-years',
        badge: '2026-2027 Active',
        badgeType: 'success',
        params: ['Active Session: 2026-2027', 'Term Boundaries', 'Session Locking', 'Promotion Cutoff'],
        icon: <Calendar className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'system-prefs',
        title: 'System Preferences & Policies',
        description: 'School/branch-level operational preferences, locale defaults, auto-lock policies, multi-factor authentication & security settings.',
        href: '/admin/settings/roles',
        badge: 'Standard Rules',
        badgeType: 'default',
        params: ['Session Timeout: 30m', 'Locale: Bilingual (EN/UR)', 'Audit Trail: Enabled', 'Lockout Limit: 5'],
        icon: <ShieldCheck className="w-4 h-4 text-purple-600" />,
      },
    ],
  },

  // 2. STUDENTS
  {
    id: 'students',
    label: 'Students',
    shortLabel: 'Students',
    icon: <GraduationCap className="w-4 h-4" />,
    description: 'Admission numbering sequences, student categories, houses, lifecycle status, dynamic custom fields & document requirements.',
    cards: [
      {
        id: 'admission-settings',
        title: 'Admission Settings & Sequences',
        description: 'Configure admission number formatting, auto-numbering prefixes (e.g. ADM-2026-XXXX), digit lengths & annual reset rules.',
        href: '/admin/students/settings',
        badge: 'ADM-YYYY-0000',
        badgeType: 'info',
        params: ['Auto Numbering: Active', 'Prefix: ADM-2026', 'Digit Length: 4 Digits', 'Reset: Annual'],
        icon: <UserPlus className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'student-categories',
        title: 'Student Categories',
        description: 'Configure student enrollment categories: Day Scholar, Boarder, Orphan, Staff Child, Hafiz, Special Needs.',
        href: '/admin/students/settings',
        badge: '6 Categories',
        badgeType: 'default',
        params: ['Day Scholar', 'Boarder', 'Orphan / Concession', 'Staff Child', 'Hafiz-e-Quran'],
        icon: <Users className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'student-houses',
        title: 'Student Houses',
        description: 'House allocation rules, house masters, team colors, mottos, student distribution & inter-house activity points ledger.',
        href: '/admin/students/settings',
        badge: '4 Houses Active',
        badgeType: 'default',
        params: ['Iqbal (Green)', 'Jinnah (Blue)', 'Sir Syed (Red)', 'Liaquat (Yellow)'],
        icon: <Award className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'clubs-groups',
        title: 'Clubs / Activity Groups',
        description: 'Extracurricular activity groups: Science Society, Debating Club, Robotics Guild, Sports Council & Arts Guild.',
        href: '/admin/students/settings',
        badge: '8 Clubs Active',
        badgeType: 'default',
        params: ['Science Society', 'Debating Club', 'Robotics Guild', 'Sports Council'],
        icon: <Sparkles className="w-4 h-4 text-purple-600" />,
      },
      {
        id: 'student-lifecycle',
        title: 'Student Status & Lifecycle',
        description: 'Lifecycle transition rules: Enrolled, Promoted, Suspended, Struck Off, SLC Issued, Alumni, Transferred.',
        href: '/admin/students/settings',
        badge: '7 States Defined',
        badgeType: 'info',
        params: ['Enrolled', 'Promoted', 'Suspended', 'Struck Off', 'SLC Issued', 'Alumni'],
        icon: <RefreshCw className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'custom-fields',
        title: 'Student Custom Fields',
        description: 'Dynamic institutional fields: B-Form / CNIC, blood group, emergency contact details, medical records, transport stop.',
        href: '/admin/students/settings',
        badge: '12 Dynamic Fields',
        badgeType: 'default',
        params: ['B-Form / CNIC', 'Blood Group', 'Allergy Record', 'Transport Route Stop'],
        icon: <Sliders className="w-4 h-4 text-sky-600" />,
      },
      {
        id: 'document-reqs',
        title: 'Document Requirements',
        description: 'Mandatory and optional document checklists for new admissions: Birth Certificate, Form-B, Previous SLC, Father CNIC.',
        href: '/admin/students/settings',
        badge: '5 Mandatory Docs',
        badgeType: 'default',
        params: ['Birth Certificate', 'Previous School SLC', 'B-Form Copy', 'Father CNIC'],
        icon: <FileCheck className="w-4 h-4 text-teal-600" />,
      },
      {
        id: 'guardian-types',
        title: 'Guardian Relationship Types',
        description: 'Configurable guardian relationships: Father, Mother, Brother, Sister, Uncle, Legal Guardian with emergency contact priorities.',
        href: '/admin/students/settings',
        badge: '8 Relationships',
        badgeType: 'default',
        params: ['Father (Primary)', 'Mother', 'Legal Guardian', 'Emergency Contact Priority'],
        icon: <UserCheck className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'previous-school',
        title: 'Previous School Configuration',
        description: 'School verification rules, previous board registration, transfer certificate validity & credit transfer mappings.',
        href: '/admin/students/settings',
        badge: 'Verification Rules',
        badgeType: 'default',
        params: ['Board Affiliation Check', 'SLC Verification Required', 'Marks Equivalency'],
        icon: <School className="w-4 h-4 text-slate-600" />,
      },
      {
        id: 'id-card-templates',
        title: 'Student ID Card Templates',
        description: 'Barcode / QR code formatting, student photo dimensions, orientation (Portrait/Landscape) & batch printing layouts.',
        href: '/admin/students/settings',
        badge: 'CR80 Standard',
        badgeType: 'info',
        params: ['QR Code Identity', 'Portrait CR80 Layout', 'Emergency Contact Line', 'Validity Tag'],
        icon: <CreditCard className="w-4 h-4 text-violet-600" />,
      },
    ],
  },

  // 3. FEES & BILLING
  {
    id: 'fees-billing',
    label: 'Fees & Billing',
    shortLabel: 'Fees & Billing',
    icon: <Coins className="w-4 h-4" />,
    description: 'Fee categories, fee heads, structures, configurable discount engine, installment plans, security deposits & late surcharges.',
    cards: [
      {
        id: 'fee-categories',
        title: 'Fee Categories',
        description: 'Master fee categories: Tuition, Admission, Annual Charges, Exam Fee, Transport, Laboratory, Library & Uniform.',
        href: '/admin/billing',
        badge: '8 Categories',
        badgeType: 'default',
        params: ['Tuition Fee', 'Admission Fee', 'Annual Charges', 'Transport Addon', 'Laboratory Fee'],
        icon: <Coins className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'fee-heads',
        title: 'Fee Heads Master',
        description: 'Granular billing components, GL account mapping, tax applicability & refundable/non-refundable rules.',
        href: '/admin/billing',
        badge: '18 Active Heads',
        badgeType: 'info',
        params: ['Tuition (Monthly)', 'Registration (One-time)', 'Lab Maintenance', 'Paper Fund'],
        icon: <Receipt className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'fee-structures',
        title: 'Fee Structures & Matrix',
        description: 'Class-wise and category-specific fee matrices with effective date ranges, package bundling & recurring billing rules.',
        href: '/admin/billing',
        badge: '12 Class Packages',
        badgeType: 'success',
        params: ['Grade 1-5 Package', 'Grade 6-8 Package', 'Matric Science', 'O-Levels Standard'],
        icon: <LayoutGrid className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'discount-engine',
        title: 'Discount Types & Rules Engine',
        description: 'Multiple configurable discount types: Sibling Concession, Need-Based, Merit Scholarship, Staff Child, Early Payment Discount.',
        href: '/admin/billing',
        badge: 'Configurable Engine',
        badgeType: 'info',
        params: ['Sibling: 20% on 2nd Child', 'Staff Child: 50%', 'Merit: Top 3 Students', 'Stacking Rules'],
        icon: <Percent className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'concessions',
        title: 'Concessions & Scholarships',
        description: 'Scholarship quotas, concession approval chains, donor/trust funding allocations & annual renewal performance criteria.',
        href: '/admin/billing',
        badge: 'Active Quotas',
        badgeType: 'default',
        params: ['Trust Quota: Max 5%', 'Principal Discretion', 'Academic Performance Prerequisite'],
        icon: <Award className="w-4 h-4 text-purple-600" />,
      },
      {
        id: 'installment-settings',
        title: 'Installment & Payment Plans',
        description: 'Custom fee installment splits (2, 3, 4, 10 installments), split ratios, processing fees & customized due date schedules.',
        href: '/admin/billing',
        badge: 'Flexible Plans',
        badgeType: 'default',
        params: ['2-Split Plan (50/50)', '3-Split Term Plan', 'Monthly 10-Split', 'Grace Periods'],
        icon: <Wallet className="w-4 h-4 text-teal-600" />,
      },
      {
        id: 'security-deposits',
        title: 'Security Deposits Settings',
        description: 'Admission caution money, hostel security & library deposit rules with refundable / non-refundable configuration & clearance rules.',
        href: '/admin/billing',
        badge: 'Refundable / Non-Ref',
        badgeType: 'info',
        params: ['Caution Money (Refundable)', 'Hostel Deposit', 'Clearance Workflow Prerequisite'],
        icon: <Shield className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'fine-types',
        title: 'Fine Types & Surcharges',
        description: 'Grace period settings (e.g. 10 days), daily late fee, flat penalty, percentage surcharges & maximum penalty caps.',
        href: '/admin/billing',
        badge: 'Grace: 10 Days',
        badgeType: 'warning',
        params: ['Grace Period: 10 Days', 'Daily Surcharge: PKR 50/day', 'Max Cap: PKR 1,500', 'Waiver Authority'],
        icon: <AlertCircle className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'payment-methods',
        title: 'Payment Methods & Gateways',
        description: '1Link 1BILL, KuickPay, JazzCash, EasyPaisa, Bank Challan branch network, Credit/Debit Card & Cash Desk.',
        href: '/admin/billing',
        badge: '1Link • KuickPay • Bank',
        badgeType: 'success',
        params: ['1Link 1BILL (Biller ID)', 'KuickPay Integrated', 'Bank Branches (HBL, Meezan)', 'Cash Desk'],
        icon: <CreditCard className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'voucher-numbering',
        title: 'Voucher Numbering & Settings',
        description: '3-part / 4-part bank challan print templates (School/Bank/Student copies), barcode generation & sequence rules.',
        href: '/admin/billing',
        badge: '3-Part Standard',
        badgeType: 'default',
        params: ['3-Part Bank Challan', 'Barcode (Code 128)', 'Voucher Prefix: VCH-2026', 'Bank Stamp Area'],
        icon: <FileSpreadsheet className="w-4 h-4 text-slate-600" />,
      },
      {
        id: 'billing-rules',
        title: 'Billing Cycles & Invoicing Rules',
        description: 'Monthly advance billing, quarterly schedules, auto-generation dates (25th of month) & automated arrears rollover policies.',
        href: '/admin/billing',
        badge: 'Monthly Advance',
        badgeType: 'default',
        params: ['Generation Day: 25th', 'Due Day: 10th of Next Month', 'Arrears Auto-Rollover', 'SMS Reminder'],
        icon: <Sliders className="w-4 h-4 text-sky-600" />,
      },
    ],
  },

  // 4. ACADEMICS
  {
    id: 'academics',
    label: 'Academics',
    shortLabel: 'Academics',
    icon: <BookOpen className="w-4 h-4" />,
    description: 'Classes, sections, subjects, class-subject mapping, grading schemes, pass/fail criteria & promotion rules.',
    cards: [
      {
        id: 'classes',
        title: 'Classes / Grades Master',
        description: 'Configure classes from Playgroup, Kindergarten, Grade 1 to 12, O/A Levels, HSSC/SSC with sequence order.',
        href: '/admin/settings/classes',
        badge: '14 Grades Active',
        badgeType: 'success',
        params: ['Grade 1 - 10 (SSC)', 'O-Level 1 - 3', 'A-Level 1 - 2', 'Class Category Linking'],
        icon: <GraduationCap className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'sections',
        title: 'Sections Registry',
        description: 'Manage class sections (A, B, C, Rose, Tulip), stream allocations (Pre-Medical/Engineering) & student capacity limits.',
        href: '/admin/settings/sections',
        badge: '36 Sections',
        badgeType: 'default',
        params: ['Capacity Limit: 35', 'Class Teacher Assignment', 'Room Assignment', 'Gender Allocation'],
        icon: <LayoutGrid className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'subjects',
        title: 'Subjects Master',
        description: 'Subject catalog: subject codes, theoretical/practical components, credit hours & departmental ownership.',
        href: '/admin/settings/subjects',
        badge: '42 Subjects',
        badgeType: 'info',
        params: ['Mathematics (MTH-101)', 'Physics (PHY-101)', 'English Language', 'Urdu / Islamic Studies'],
        icon: <BookOpen className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'class-subjects',
        title: 'Class-Subject Mapping',
        description: 'Curriculum allocation matrix linking classes, compulsory vs. optional subjects & weekly period requirements.',
        href: '/admin/settings/class-subjects',
        badge: 'Curriculum Grid',
        badgeType: 'default',
        params: ['Compulsory Subjects', 'Elective Subject Pools', 'Weekly Periods: 6', 'Faculty Linking'],
        icon: <Network className="w-4 h-4 text-purple-600" />,
      },
      {
        id: 'curriculum-syllabus',
        title: 'Curriculum / Syllabus Master',
        description: 'Term-wise syllabus breakdown, unit planners, chapter milestones, learning outcomes & recommended textbooks.',
        href: '/admin/academics/subjects',
        badge: 'Term 1 & 2 Plans',
        badgeType: 'default',
        params: ['Chapter Breakdowns', 'Planned Teaching Hours', 'Assessment Weights', 'Textbook Allocation'],
        icon: <FileText className="w-4 h-4 text-teal-600" />,
      },
      {
        id: 'grading-schemes',
        title: 'Grading Schemes (Configurable)',
        description: 'Configurable multi-system grading: Percentage bands, 7-point scale (A+/A/B/C/D/E/F), Cambridge A*-U & GPA scales.',
        href: '/admin/exams',
        badge: 'Multi-System Ready',
        badgeType: 'info',
        params: ['Percentage Bands (90+ A+)', 'Cambridge (A*, A, B, C, D, E, U)', '7-Point Scale', 'GPA 4.00'],
        icon: <Percent className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'gpa-rules',
        title: 'GPA Calculation Rules',
        description: 'Weighted average calculation formulas, credit-hour weighted GPA algorithms, cumulative CGPA & precision rounding.',
        href: '/admin/exams',
        badge: '4.00 Scale',
        badgeType: 'default',
        params: ['Credit-Weighted GPA', 'Precision: 2 Decimals', 'Failing Grade Impact', 'Honors Threshold'],
        icon: <Sliders className="w-4 h-4 text-sky-600" />,
      },
      {
        id: 'pass-fail-rules',
        title: 'Pass / Fail & Grace Marks Rules',
        description: 'Aggregate passing threshold (40%), individual subject minimums, maximum grace marks policy (5 marks) & moderation rules.',
        href: '/admin/exams',
        badge: 'Min: 40% (Grace: 5)',
        badgeType: 'warning',
        params: ['Subject Passing: 40%', 'Aggregate Passing: 45%', 'Max Grace Marks: 5', 'Compartment Limit: 2'],
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'promotion-rules',
        title: 'Promotion Rules & Criteria',
        description: 'Criteria for promotion to next grade, conditional promotion rules, attendance prerequisites (75%) & retention policies.',
        href: '/admin/students',
        badge: 'Auto-Promotion',
        badgeType: 'default',
        params: ['Max Failed Subjects: 1', 'Attendance Prerequisite: 75%', 'Principal Discretion Override'],
        icon: <ArrowRight className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'exam-academic-rules',
        title: 'Exam-Related Academic Rules',
        description: 'Term weightage distribution (Monthly Tests 20%, Mid-Term 30%, Final 50%), re-test policies & absentee rules.',
        href: '/admin/exams',
        badge: 'Weights: 20/30/50',
        badgeType: 'info',
        params: ['Monthly Tests: 20%', 'Mid-Term Exam: 30%', 'Final Exam: 50%', 'Re-Exam Regulations'],
        icon: <FileCheck className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'homework-config',
        title: 'Homework Configuration',
        description: 'Daily homework limits (max 60 mins), submission deadlines, online upload rules, rubric grading & late submission policies.',
        href: '/admin/academics',
        badge: 'Standard Policy',
        badgeType: 'default',
        params: ['Daily Max Time: 60 mins', 'Late Penalty: 5%/day', 'Parent Notification Trigger'],
        icon: <FileCode2 className="w-4 h-4 text-purple-600" />,
      },
      {
        id: 'academic-calendar-settings',
        title: 'Academic Calendar Settings',
        description: 'Term commencement/end dates, result publishing milestones, parent-teacher meetings (PTM) & syllabus completion cutoffs.',
        href: '/admin/settings/holidays',
        badge: '3 Terms Defined',
        badgeType: 'default',
        params: ['Term 1 (Aug - Nov)', 'Term 2 (Dec - Feb)', 'Term 3 (Mar - May)', 'PTM Windows'],
        icon: <Calendar className="w-4 h-4 text-emerald-600" />,
      },
    ],
  },

  // 5. TIMETABLE
  {
    id: 'timetable',
    label: 'Timetable',
    shortLabel: 'Timetable',
    icon: <Clock className="w-4 h-4" />,
    description: 'Timetable multi-schedule profiles, period & bell definitions, teacher workload constraints, room allocation & conflict rules.',
    cards: [
      {
        id: 'timetable-profiles',
        title: 'Timetable Profiles & Schedules',
        description: 'Multi-profile schedule architecture: Standard Timetable, Ramadan Timetable, Summer Timings, Winter Timings, Exam Windows.',
        href: '/admin/academics/timetable',
        badge: '5 Profiles Configured',
        badgeType: 'info',
        params: ['Standard Timetable (Active)', 'Ramadan Timetable (Short)', 'Summer Timings', 'Winter Timings', 'Exam Windows'],
        icon: <Clock className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'period-definitions',
        title: 'Period Definitions & Bell Times',
        description: 'Period duration (40/45 min), zero period, morning assembly time, bell chime signals & transition time buffers.',
        href: '/admin/academics/timetable',
        badge: '8 Periods / Day',
        badgeType: 'default',
        params: ['Start Time: 08:00', 'End Time: 14:00', 'Period Length: 40m', 'Assembly: 15m'],
        icon: <Sliders className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'break-periods',
        title: 'Break Periods & Recesses',
        description: 'Short break, lunch recess, Friday Jummah prayer break adjustments, playground allocations & teacher duty rosters.',
        href: '/admin/academics/timetable',
        badge: '2 Daily Breaks',
        badgeType: 'default',
        params: ['Short Break: 10:30-10:50', 'Lunch: 12:30-13:00', 'Friday Jummah Adjustment: 12:30 Dismissal'],
        icon: <CalendarOff className="w-4 h-4 text-slate-600" />,
      },
      {
        id: 'teacher-availability',
        title: 'Teacher Availability & Off-Days',
        description: 'Part-time faculty availability windows, visiting lecturer slots, weekly day-off preferences & special timing exceptions.',
        href: '/admin/academics/timetable',
        badge: 'Faculty Constraints',
        badgeType: 'default',
        params: ['Part-Time Slot Windows', 'Visiting Faculty Hours', 'Day-Off Preferences'],
        icon: <Users className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'teacher-max-load',
        title: 'Teacher Maximum Workload',
        description: 'Maximum periods per day (5), max consecutive periods (3), weekly teaching hours cap (24 periods) & free prep period rules.',
        href: '/admin/academics/timetable',
        badge: 'Max 24 Periods/Wk',
        badgeType: 'warning',
        params: ['Max Daily Load: 5 Periods', 'Max Consecutive: 3 Periods', 'Free Prep Period: 1/day'],
        icon: <Briefcase className="w-4 h-4 text-purple-600" />,
      },
      {
        id: 'teacher-subject-allocation',
        title: 'Teacher Subject Allocation Rules',
        description: 'Primary subject specialization, secondary subject permissions, grade-level qualification criteria & co-teaching assignments.',
        href: '/admin/academics/timetable',
        badge: 'Competency Matrix',
        badgeType: 'default',
        params: ['Primary Subject Domain', 'Grade Level Restrictions', 'Lab Demonstrator Allocation'],
        icon: <UserCheck className="w-4 h-4 text-teal-600" />,
      },
      {
        id: 'weekly-subject-periods',
        title: 'Weekly Subject Period Requirements',
        description: 'Subject period demand quotas (Math 6/wk, English 6/wk, Science 5/wk, Quran 3/wk) & double-period lab session rules.',
        href: '/admin/academics/timetable',
        badge: 'Quota Matrix',
        badgeType: 'default',
        params: ['Single Period Quotas', 'Consecutive Double Lab Slots', 'Weekly Frequency Rules'],
        icon: <Layers className="w-4 h-4 text-sky-600" />,
      },
      {
        id: 'room-lab-allocation',
        title: 'Room / Lab Allocation & Capacities',
        description: 'Physics Lab, Chemistry Lab, Computer Lab, Audio-Visual Room, Sports Ground capacities & subject exclusivity locks.',
        href: '/admin/academics/timetable',
        badge: '24 Facilities',
        badgeType: 'default',
        params: ['Physics Lab (Cap: 40)', 'Computer Lab (Cap: 35)', 'AV Room (Cap: 80)', 'Exclusive Subject Locks'],
        icon: <Building className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'conflict-rules',
        title: 'Conflict Rules & Constraints',
        description: 'Hard constraints (no double-booked teachers/rooms), soft constraints (teacher gap minimization, subject distribution).',
        href: '/admin/academics/timetable',
        badge: 'Strict Constraints',
        badgeType: 'info',
        params: ['No Double-Booking Guard', 'Room Clash Prevention', 'Teacher Gap Minimizer'],
        icon: <AlertCircle className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'auto-generation-rules',
        title: 'Auto Timetable Generation Rules',
        description: 'Algorithmic heuristic parameters, random seed variations, genetic algorithm weights & automated optimization rules.',
        href: '/admin/academics/timetable',
        badge: 'Algorithmic Engine',
        badgeType: 'info',
        params: ['Genetic Algorithm Optimizer', 'Fair Distribution Factor', 'Penalty Weighting Parameters'],
        icon: <Cpu className="w-4 h-4 text-blue-600" />,
      },
    ],
  },

  // 6. HR & PAYROLL
  {
    id: 'hr-payroll',
    label: 'HR & Payroll',
    shortLabel: 'HR & Payroll',
    icon: <Briefcase className="w-4 h-4" />,
    description: 'Departments, designations, employee categories, work shifts, leave entitlements, payroll rules & multi-tier approval chains.',
    cards: [
      {
        id: 'departments',
        title: 'Departments Master',
        description: 'Academic (Science, Humanities), Administration, Accounts, Security, Transport, Maintenance & IT Services.',
        href: '/admin/hr',
        badge: '8 Departments',
        badgeType: 'default',
        params: ['Academic Wing', 'Finance & Accounts', 'Administration', 'Transport & Facilities'],
        icon: <FolderTree className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'designations',
        title: 'Designations & Job Titles',
        description: 'Principal, Vice Principal, Senior Teacher, Junior Teacher, Lab Assistant, Accountant, Admin Officer, Transport Supervisor.',
        href: '/admin/hr',
        badge: '16 Designations',
        badgeType: 'default',
        params: ['Principal', 'Senior Subject Specialist', 'Junior Teacher', 'Accountant'],
        icon: <Briefcase className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'employee-categories',
        title: 'Employee Categories',
        description: 'Teaching Faculty, Administrative Staff, Support Staff (Class IV), Visiting Faculty, Contractual Consultants.',
        href: '/admin/hr',
        badge: '5 Categories',
        badgeType: 'default',
        params: ['Teaching Faculty', 'Admin Staff', 'Support Staff', 'Visiting Lecturers'],
        icon: <Users className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'employment-types',
        title: 'Employment Types & Contracts',
        description: 'Permanent, Probationary, Contractual, Daily Wage, Intern, Visiting with probation duration & notice period rules.',
        href: '/admin/hr',
        badge: '6 Contract Types',
        badgeType: 'default',
        params: ['Permanent', 'Probationary (6 Months)', 'Contractual (1 Year)', 'Daily Wage'],
        icon: <FileText className="w-4 h-4 text-teal-600" />,
      },
      {
        id: 'work-shift-templates',
        title: 'Work Shift Templates',
        description: 'Morning Shift (07:45 - 14:30), Afternoon Shift, Full Day, Saturday Half-Day with grace in/out punch windows.',
        href: '/admin/attendance',
        badge: '3 Shift Templates',
        badgeType: 'default',
        params: ['Morning (07:45 - 14:30)', 'Saturday Half-Day (08:00 - 12:30)', 'Grace Window: 15m'],
        icon: <Clock className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'work-schedule-policies',
        title: 'Work Schedule & Policies',
        description: 'Standard weekly working hours (40 hrs), overtime rates, compensatory off policies & weekend duty allowances.',
        href: '/admin/attendance',
        badge: 'Standard 40h',
        badgeType: 'default',
        params: ['Standard: 40 Hours/Week', 'Overtime Rate: 1.5x', 'Compensatory Leave Eligibility'],
        icon: <Sliders className="w-4 h-4 text-purple-600" />,
      },
      {
        id: 'leave-types',
        title: 'Leave Types Master',
        description: 'Casual Leave, Medical Leave, Annual Paid Leave, Maternity Leave, Hajj Leave, Study Leave & Duty Leave.',
        href: '/admin/hr/leaves',
        badge: '8 Leave Types',
        badgeType: 'info',
        params: ['Casual (10 Days)', 'Medical (10 Days)', 'Annual (14 Days)', 'Maternity (90 Days)'],
        icon: <Calendar className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'leave-policies',
        title: 'Leave Policies & Accruals',
        description: 'Annual quota allocation, monthly accrual rules, carry-forward caps, encashment formulas & year-end batch processing.',
        href: '/admin/hr/leaves',
        badge: 'Automated Engine',
        badgeType: 'success',
        params: ['Monthly Accrual', 'Max Carry-Forward: 5 Days', 'Encashment at Basic Pay Rate'],
        icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'attendance-rules',
        title: 'Attendance & Late / Absence Rules',
        description: 'Late arrival grace (15 mins), 3 late marks = 1/2 day deduction, half-day cutoff & automated absent notification.',
        href: '/admin/attendance',
        badge: 'Grace: 15m (3 Late = 0.5D)',
        badgeType: 'warning',
        params: ['Grace Window: 15m', '3 Late Marks = 0.5 Day Leave', 'Auto-Absent Trigger at 09:30'],
        icon: <AlertCircle className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'payroll-rules',
        title: 'Payroll Deduction Rules',
        description: 'Unpaid leave deductions, Provident Fund % (8.33%), EOBI statutory contribution, income tax slabs & staff loan deductions.',
        href: '/admin/hr',
        badge: 'Phase 3 Foundation',
        badgeType: 'info',
        params: ['Unpaid Leave Daily Rate: Basic / 30', 'Provident Fund: 8.33%', 'EOBI Contribution', 'Tax Slabs'],
        icon: <DollarSign className="w-4 h-4 text-teal-600" />,
      },
      {
        id: 'earning-types',
        title: 'Earning & Allowance Types',
        description: 'Basic Pay, House Rent Allowance (45%), Medical Allowance, Transport Allowance, Special Duty Allowance & Annual Bonus.',
        href: '/admin/hr',
        badge: '12 Heads Configured',
        badgeType: 'default',
        params: ['Basic Pay', 'House Rent (45%)', 'Medical Allowance', 'Transport Allowance', 'Special Allowance'],
        icon: <Coins className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'approval-structures',
        title: 'Approval Structures & Chains',
        description: 'Hierarchical multi-level approval chains for staff leave requests, purchase requisitions & salary increment approvals.',
        href: '/admin/hr',
        badge: '3-Tier Approval',
        badgeType: 'default',
        params: ['Level 1: Section Head', 'Level 2: Principal Office', 'Level 3: Finance / HR Director'],
        icon: <Network className="w-4 h-4 text-purple-600" />,
      },
    ],
  },

  // 7. CALENDAR & HOLIDAYS
  {
    id: 'calendar-holidays',
    label: 'Calendar & Holidays',
    shortLabel: 'Calendar',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Working days, weekly off-days, gazetted public holidays, vacation periods & academic event schedules.',
    cards: [
      {
        id: 'working-days',
        title: 'Weekly Working Days',
        description: '5-day / 6-day week configuration, Saturday half-day rules or alternate non-working Saturdays.',
        href: '/admin/settings/holidays',
        badge: 'Mon - Fri (5 Days)',
        badgeType: 'success',
        params: ['Mon - Fri Full Days', 'Saturday Administrative Only', 'Weekly Total: 5 Days'],
        icon: <Calendar className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'weekly-off',
        title: 'Weekly Off Days & Weekends',
        description: 'Designated weekly holidays (Sunday, Saturday-Sunday alternate, Friday afternoon adjustments).',
        href: '/admin/settings/holidays',
        badge: 'Sunday Full Off',
        badgeType: 'default',
        params: ['Sunday (Mandatory)', 'Saturday (Academic Off)', 'Friday (Half-Day Schedule)'],
        icon: <CalendarOff className="w-4 h-4 text-slate-600" />,
      },
      {
        id: 'public-holidays',
        title: 'Public & Gazetted Holidays',
        description: 'National gazetted holidays: Pakistan Day (23 Mar), Eid-ul-Fitr, Eid-ul-Adha, Independence Day (14 Aug), Quaid-e-Azam Day (25 Dec).',
        href: '/admin/settings/holidays',
        badge: '14 Gazetted Days',
        badgeType: 'info',
        params: ['Pakistan Day (23 Mar)', 'Independence Day (14 Aug)', 'Iqbal Day (9 Nov)', 'Quaid Day (25 Dec)'],
        icon: <Globe className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'school-holidays',
        title: 'School Institutional Holidays',
        description: 'Founder’s Day, Annual Sports Day Off, Teacher Training Days, Local Festival Holidays & Institutional Commemorations.',
        href: '/admin/settings/holidays',
        badge: '6 School Holidays',
        badgeType: 'default',
        params: ['Founder’s Day', 'Sports Gala Recovery Day', 'Teacher Training Workshop Day'],
        icon: <School className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'vacation-periods',
        title: 'Vacation Periods',
        description: 'Summer Vacation (June-July), Winter Break (Dec-Jan), Spring Break with automated fee billing & payroll adjustments.',
        href: '/admin/settings/holidays',
        badge: 'Summer & Winter',
        badgeType: 'info',
        params: ['Summer Break (Jun 01 - Jul 31)', 'Winter Break (Dec 24 - Jan 04)', 'Spring Recess (Mar 25 - 31)'],
        icon: <Compass className="w-4 h-4 text-sky-600" />,
      },
      {
        id: 'special-working-days',
        title: 'Special Working Days',
        description: 'Compensatory attendance days, Sunday working day for annual sports gala & election duty schedule adjustments.',
        href: '/admin/settings/holidays',
        badge: 'Compensatory Days',
        badgeType: 'default',
        params: ['Compensatory Working Day', 'Sports Gala Sunday', 'Exhibition Day'],
        icon: <Clock className="w-4 h-4 text-purple-600" />,
      },
      {
        id: 'academic-events',
        title: 'Academic Events & Milestones',
        description: 'Science Exhibition, Annual Speech Contest, Parent-Teacher Meetings (PTM), Sports Week dates & celebrations.',
        href: '/admin/settings/holidays',
        badge: '18 Events Scheduled',
        badgeType: 'default',
        params: ['Science Gala (Oct 15)', 'Annual Sports Week (Nov 20)', 'PTM Term 1 (Nov 28)'],
        icon: <Sparkles className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'exam-calendar-rules',
        title: 'Exam Calendar Rules',
        description: 'Exam preparation leaves, practical exam windows, date-sheet publication dates & result declaration milestones.',
        href: '/admin/settings/holidays',
        badge: 'Mid & Final Windows',
        badgeType: 'info',
        params: ['Prep Leave: 3 Days', 'Mid-Term Window (Dec 05-15)', 'Final Exam (May 10-25)'],
        icon: <FileCheck className="w-4 h-4 text-teal-600" />,
      },
    ],
  },

  // 8. LIBRARY
  {
    id: 'library',
    label: 'Library',
    shortLabel: 'Library',
    icon: <Library className="w-4 h-4" />,
    description: 'Book classifications (DDC), media formats, shelf/rack indexing, borrowing quotas, overdue fines & OPAC digital catalog rules.',
    cards: [
      {
        id: 'book-categories',
        title: 'Book Categories Master',
        description: 'Dewey Decimal Classification (DDC), Science, Literature, Islamic Studies, Reference, Journals, Children’s Fiction.',
        href: '/admin/library',
        badge: '24 Categories',
        badgeType: 'default',
        params: ['Dewey Decimal (000-999)', 'Islamic Studies', 'Science & Tech', 'Literature & Fiction'],
        icon: <BookOpen className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'book-types',
        title: 'Book Types & Media Formats',
        description: 'Printed Hardcover, Paperback, Reference Copy (Non-Issuable), CD/DVD, Digital eBook, Periodical / Magazine.',
        href: '/admin/library',
        badge: '6 Formats',
        badgeType: 'default',
        params: ['Hardcover', 'Paperback', 'Reference Copy (No Issue)', 'Digital eBook'],
        icon: <Layers className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'library-locations',
        title: 'Library Locations & Racks',
        description: 'Main Library, Junior Wing Library, Shelf numbers, Rack A1-F8, Row & Column indexing for instant physical discovery.',
        href: '/admin/library',
        badge: '48 Racks Indexed',
        badgeType: 'info',
        params: ['Main Campus Library', 'Junior Wing Corner', 'Rack A1 - F8', 'Shelf Grid 1-6'],
        icon: <MapPin className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'membership-rules',
        title: 'Membership & User Quotas',
        description: 'Student borrowing limit (2 books), Faculty limit (5 books), Staff limit (3 books) & library card barcode generation.',
        href: '/admin/library',
        badge: 'Student / Staff Quotas',
        badgeType: 'default',
        params: ['Student Limit: 2 Books', 'Faculty Limit: 5 Books', 'Staff Limit: 3 Books', 'Card Expiry: 1 Year'],
        icon: <UserCheck className="w-4 h-4 text-teal-600" />,
      },
      {
        id: 'issue-return-rules',
        title: 'Issue, Return & Renewal Rules',
        description: 'Loan period (14 days for students, 30 days for staff), max renewal count (2 renewals) & reservation priorities.',
        href: '/admin/library',
        badge: '14-Day Standard',
        badgeType: 'default',
        params: ['Student Loan: 14 Days', 'Staff Loan: 30 Days', 'Max Renewals: 2', 'Reservation Lock: 24h'],
        icon: <RefreshCw className="w-4 h-4 text-purple-600" />,
      },
      {
        id: 'fine-rules',
        title: 'Fine Rules & Lost Book Policies',
        description: 'Daily overdue fine rate (PKR 10/day), maximum fine cap, damaged book penalty & lost replacement fee multiplier (1.5x).',
        href: '/admin/library',
        badge: 'PKR 10/Day',
        badgeType: 'warning',
        params: ['Overdue: PKR 10/Day', 'Max Cap: PKR 500', 'Damaged Book: 50% Cost', 'Lost: Cost x 1.5'],
        icon: <AlertCircle className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'digital-library-settings',
        title: 'Digital Library & OPAC Settings',
        description: 'Online Public Access Catalog (OPAC) search visibility, e-book PDF access permissions & barcode/RFID scanner compatibility.',
        href: '/admin/library',
        badge: 'OPAC Active',
        badgeType: 'info',
        params: ['OPAC Search Portal', 'PDF E-Book Reader', 'Barcode Scanner (Code 39)', 'RFID Tagging'],
        icon: <Globe className="w-4 h-4 text-sky-600" />,
      },
    ],
  },

  // 9. INVENTORY & STORE
  {
    id: 'inventory-store',
    label: 'Inventory & Store',
    shortLabel: 'Inventory',
    icon: <Package className="w-4 h-4" />,
    description: 'Item catalogs, units of measurement (UOM), warehouses, vendor registry, reorder thresholds & fixed asset depreciation.',
    cards: [
      {
        id: 'item-categories',
        title: 'Item Categories Master',
        description: 'Stationery, Uniforms, Textbooks, Science Lab Consumables, IT Hardware, Sports Equipment, Furniture, Cleaning Supplies.',
        href: '/admin/inventory',
        badge: '14 Categories',
        badgeType: 'default',
        params: ['Stationery & Printing', 'Uniforms & Badges', 'Science Lab Supplies', 'IT Equipment'],
        icon: <Package className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'uom',
        title: 'Units of Measurement (UOM)',
        description: 'Pieces (Pcs), Boxes, Bundles, Kilograms (Kg), Liters, Reams, Packets, Pairs, Dozens & conversion multipliers.',
        href: '/admin/inventory',
        badge: '12 Standard Units',
        badgeType: 'default',
        params: ['Pieces (Pcs)', 'Boxes (12 Pcs)', 'Reams (500 Sheets)', 'Kilograms (Kg)'],
        icon: <Layers className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'store-locations',
        title: 'Store Locations & Warehouses',
        description: 'Main Central Store, Science Lab Store, Stationery Retail Counter, Sports Store, Maintenance Storage Shed.',
        href: '/admin/inventory',
        badge: '5 Warehouses',
        badgeType: 'info',
        params: ['Main Central Store', 'Stationery Counter', 'Science Lab Store', 'Sports Warehouse'],
        icon: <Building className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'suppliers',
        title: 'Suppliers & Vendor Registry',
        description: 'Vendor profiles, NTN / GST registration, contact details, payment terms, credit limits & institutional bank accounts.',
        href: '/admin/inventory',
        badge: '32 Active Vendors',
        badgeType: 'default',
        params: ['Vendor NTN/GST', 'Credit Limit (PKR 500k)', 'Payment Terms: 30 Days', 'Bank Details'],
        icon: <Briefcase className="w-4 h-4 text-teal-600" />,
      },
      {
        id: 'stock-rules',
        title: 'Stock Rules & Reorder Levels',
        description: 'Safety buffer stock, minimum reorder thresholds, automated low-stock warnings & stock valuation method (FIFO / Avg Cost).',
        href: '/admin/inventory',
        badge: 'FIFO Valuation',
        badgeType: 'info',
        params: ['Valuation: FIFO', 'Low-Stock Warning Trigger', 'Safety Stock Buffers', 'Stocktake Interval: Monthly'],
        icon: <Sliders className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'asset-categories',
        title: 'Fixed Asset Categories & Depreciation',
        description: 'Computers (20% straight line), Furniture (10%), Lab Equipment, Vehicles, Building, Tagging & QR labels.',
        href: '/admin/inventory',
        badge: 'Depreciation Rules',
        badgeType: 'default',
        params: ['IT Assets: 20% Straight Line', 'Furniture: 10%', 'Vehicles: 15%', 'QR Asset Tagging'],
        icon: <Landmark className="w-4 h-4 text-purple-600" />,
      },
      {
        id: 'procurement-settings',
        title: 'Procurement & Purchase Rules',
        description: 'Purchase requisition workflow, minimum 3 quotations requirement, PO approval authority limits & receiving inspection.',
        href: '/admin/inventory',
        badge: 'PO Authorization',
        badgeType: 'default',
        params: ['Min 3 Quotations (>50k)', 'Principal PO Limit: PKR 200k', 'Inspection Report Required'],
        icon: <Receipt className="w-4 h-4 text-slate-600" />,
      },
      {
        id: 'school-store-pos',
        title: 'School Store & POS Settings',
        description: 'Retail counter sales for books/uniforms, student fee ledger direct debit, barcode scanning & receipt printing.',
        href: '/admin/inventory',
        badge: 'POS Counter Active',
        badgeType: 'success',
        params: ['Direct Debit to Student Fee', 'POS Thermal Print (80mm)', 'Barcode Fast Checkout'],
        icon: <CreditCard className="w-4 h-4 text-sky-600" />,
      },
    ],
  },

  // 10. ACCOUNTS & FINANCE
  {
    id: 'accounts-finance',
    label: 'Accounts & Finance',
    shortLabel: 'Accounts',
    icon: <Receipt className="w-4 h-4" />,
    description: 'Chart of Accounts (COA), fiscal year, canonical voucher types, bank ledgers, posting rules & budget controls.',
    cards: [
      {
        id: 'chart-of-accounts',
        title: 'Chart of Accounts (COA)',
        description: 'Multi-tier GL hierarchy: Assets (1000), Liabilities (2000), Equity (3000), Revenue (4000), Expenses (5000).',
        href: '/admin/accounts',
        badge: '5-Tier Standard COA',
        badgeType: 'info',
        params: ['1000 Assets (Cash, Bank, Receivables)', '2000 Liabilities', '4000 Revenue', '5000 Expenses'],
        icon: <FolderTree className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'financial-year',
        title: 'Financial Year & Fiscal Periods',
        description: 'Fiscal year definition (July 1 - June 30), period locking, monthly closure & year-end closing journals.',
        href: '/admin/accounts',
        badge: 'FY 2026-2027 Active',
        badgeType: 'success',
        params: ['FY Dates: Jul 01 - Jun 30', 'Active Period: Q1', 'Period Lock Date: 5th of Month'],
        icon: <Calendar className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'voucher-types',
        title: 'Voucher Types Master',
        description: 'Cash Payment Voucher (CPV), Cash Receipt (CRV), Bank Payment (BPV), Bank Receipt (BRV), Journal Voucher (JV).',
        href: '/admin/accounts',
        badge: '5 Canonical Types',
        badgeType: 'default',
        params: ['CPV (Cash Payment)', 'CRV (Cash Receipt)', 'BPV (Bank Payment)', 'BRV (Bank Receipt)', 'JV (Journal)'],
        icon: <Receipt className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'cost-centers',
        title: 'Cost Centers & Branches',
        description: 'Campus cost centers, departmental expense allocations, vehicle fleet cost centers & institutional activity codes.',
        href: '/admin/accounts',
        badge: '8 Cost Centers',
        badgeType: 'default',
        params: ['Main Campus (CC-01)', 'Junior Wing (CC-02)', 'Transport Fleet (CC-03)', 'Cafeteria'],
        icon: <Building2 className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'bank-accounts',
        title: 'Bank Accounts Registry',
        description: 'Institutional bank accounts, IBAN, branch codes, electronic clearing (1BILL/1Link) & cheque book sequence registers.',
        href: '/admin/accounts',
        badge: '4 Active Accounts',
        badgeType: 'success',
        params: ['HBL Fee Collection A/C', 'Meezan Operational A/C', '1BILL Biller ID Linked', 'Cheque Sequence'],
        icon: <Landmark className="w-4 h-4 text-teal-600" />,
      },
      {
        id: 'cash-accounts',
        title: 'Cash Desks & Petty Cash Rules',
        description: 'Main cash register, principal petty cash imprest, daily cash holding limit (PKR 50,000) & cashier reconciliation.',
        href: '/admin/accounts',
        badge: 'Imprest: PKR 50k',
        badgeType: 'info',
        params: ['Main Cash Counter', 'Principal Petty Cash Imprest', 'Max Cash Limit: PKR 50,000', 'Daily Recon'],
        icon: <Wallet className="w-4 h-4 text-purple-600" />,
      },
      {
        id: 'posting-rules',
        title: 'Automated Posting Rules',
        description: 'Real-time fee collection posting, payroll journal auto-generation, store consumption journals & depreciation posting.',
        href: '/admin/accounts',
        badge: 'Auto-Sync Active',
        badgeType: 'default',
        params: ['Fee Receipt -> Cash/Bank Debit', 'Payroll -> Salary Expense Debit', 'Store Issue -> Expense'],
        icon: <RefreshCw className="w-4 h-4 text-sky-600" />,
      },
      {
        id: 'accounting-integration',
        title: 'Accounting Integration Settings',
        description: 'Sub-ledger to General Ledger integration rules for Billing, Payroll, Inventory, and Fixed Asset modules.',
        href: '/admin/accounts',
        badge: 'Sub-Ledger Linked',
        badgeType: 'default',
        params: ['Billing Sub-Ledger', 'Payroll Sub-Ledger', 'Store Sub-Ledger', 'Asset Sub-Ledger'],
        icon: <Network className="w-4 h-4 text-slate-600" />,
      },
      {
        id: 'budget-config',
        title: 'Budget Configuration & Alerts',
        description: 'Annual departmental operating budgets, capital expenditure limits, variance alert thresholds & overrun locking.',
        href: '/admin/accounts',
        badge: 'FY27 Budget Active',
        badgeType: 'info',
        params: ['Annual Cap: PKR 45M', 'Variance Alert: >10%', 'Overrun Lock: Hard Stop on Capex'],
        icon: <Sliders className="w-4 h-4 text-blue-600" />,
      },
    ],
  },

  // 11. REPORTS & TEMPLATES
  {
    id: 'reports-templates',
    label: 'Reports & Templates',
    shortLabel: 'Templates',
    icon: <FileSpreadsheet className="w-4 h-4" />,
    description: 'Document template mapping studio, report card formats, SLC certificates, print layouts & serial numbering sequences.',
    cards: [
      {
        id: 'report-templates',
        title: 'Report Templates Library',
        description: 'Term Report Cards, Continuous Assessment Sheets, Fee Vouchers, Tabulation Sheets, Merit Lists & Grade Registers.',
        href: '/admin/reports',
        badge: '18 Templates',
        badgeType: 'info',
        params: ['Term 1 Report Card', 'Cumulative Transcript', 'Tabulation Sheet (Broadsheet)', 'Class Merit List'],
        icon: <FileSpreadsheet className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'document-templates',
        title: 'Document Templates Master',
        description: 'School Leaving Certificate (SLC), Character Certificate, Bonafide Certificate, Teacher Appointment Letter, Experience Letter.',
        href: '/admin/reports',
        badge: '12 Documents',
        badgeType: 'default',
        params: ['School Leaving Certificate (SLC)', 'Character Certificate', 'Bonafide Certificate', 'Appointment Letter'],
        icon: <FileCheck className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'field-mapping',
        title: 'ERP Field Mapping Dictionary',
        description: 'Data dictionary of 120+ available placeholders across Student, Academic, Exam, Billing, HR & School Profile domains.',
        href: '/admin/reports',
        badge: '120+ Placeholders',
        badgeType: 'default',
        params: ['{{student.name}}', '{{student.roll_no}}', '{{marks.total}}', '{{grade}}', '{{fee.balance}}'],
        icon: <Network className="w-4 h-4 text-purple-600" />,
      },
      {
        id: 'print-layouts',
        title: 'Print Layouts, Sizes & Margins',
        description: 'A4, Legal, Letter, Thermal Receipt (80mm), Portrait/Landscape, header/footer heights & institutional watermark rules.',
        href: '/admin/reports',
        badge: 'A4 • Legal • Thermal',
        badgeType: 'info',
        params: ['Page Sizes: A4, Legal, Letter', 'Thermal POS (80mm)', 'Top Margin: 25mm (Letterhead)'],
        icon: <Printer className="w-4 h-4 text-teal-600" />,
      },
      {
        id: 'report-designer',
        title: 'Report Designer & Watermark Studio',
        description: 'Institutional letterhead positioning, QR authentication code, principal digital signature position & embossed seal.',
        href: '/admin/reports',
        badge: 'Visual Studio',
        badgeType: 'default',
        params: ['Header Letterhead Area', 'QR Code Verification Token', 'Principal Signature Slot', 'Watermark Opacity: 8%'],
        icon: <Sparkles className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'document-numbering',
        title: 'Document Sequence & Prefixes',
        description: 'SLC serial numbering (SLC-2026-0001), Bonafide serials, Character Certificate registration numbers & reset rules.',
        href: '/admin/reports',
        badge: 'Sequential Serials',
        badgeType: 'default',
        params: ['SLC Prefix: SLC-2026', 'Bonafide Prefix: BON-2026', 'Digit Length: 4', 'Immutable Counter'],
        icon: <Tag className="w-4 h-4 text-slate-600" />,
      },
    ],
  },

  // 12. SYSTEM & INTEGRATIONS
  {
    id: 'system-integrations',
    label: 'System & Integrations',
    shortLabel: 'System',
    icon: <Sliders className="w-4 h-4" />,
    description: 'Users, roles, RBAC permissions, SMS gateways, SMTP email, biometric machines, RFID turnstiles & security audit trail.',
    cards: [
      {
        id: 'users',
        title: 'Users & Staff Accounts',
        description: 'User accounts, login IDs, temporary passwords, account lockouts & two-factor authentication (2FA) enforcement.',
        href: '/admin/settings/roles',
        badge: '48 Active Users',
        badgeType: 'success',
        params: ['Admin Accounts (3)', 'Faculty Logins (35)', 'Staff Accounts (10)', '2FA Enforcement: Optional'],
        icon: <Users className="w-4 h-4 text-blue-600" />,
      },
      {
        id: 'roles',
        title: 'System Roles Master',
        description: 'Super Admin, Principal, Academic Head, Fee Incharge, Accountant, HR Manager, Teacher, Parent, Student.',
        href: '/admin/settings/roles',
        badge: '11 Roles Defined',
        badgeType: 'info',
        params: ['SUPER_ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'TEACHER', 'PARENT', 'STUDENT'],
        icon: <Shield className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'permissions-matrix',
        title: 'Permissions & Access Control (RBAC)',
        description: '150+ granular permissions (View, Create, Edit, Delete, Approve, Export) mapped across all 12 modules.',
        href: '/admin/settings/roles',
        badge: 'Multi-Tenant RBAC',
        badgeType: 'info',
        params: ['150+ Action Permissions', 'Row-Level Tenant Guard', 'Export Authorizations', 'Branch Isolation'],
        icon: <Key className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'notification-triggers',
        title: 'Notification Settings & Triggers',
        description: 'Automated event triggers for Fee Due, Attendance Absent, Exam Marks Published, Leave Status & Birthday alerts.',
        href: '/admin/communication',
        badge: '24 Event Triggers',
        badgeType: 'default',
        params: ['Absent SMS (09:45 AM)', 'Fee Due Reminder (1st & 7th)', 'Exam Result SMS', 'Emergency Broadcast'],
        icon: <Bell className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'sms-gateway',
        title: 'SMS Gateway Configuration',
        description: 'Branded Masking SMS provider (Telenor, Jazz, Zong, Twilio), API key, sender ID & character counter settings.',
        href: '/admin/communication',
        badge: 'Masking Active',
        badgeType: 'success',
        params: ['Sender ID: GREENWOOD', 'Provider: Telenor Business', 'API Key Verified', 'Balance: 12,450 SMS'],
        icon: <Smartphone className="w-4 h-4 text-teal-600" />,
      },
      {
        id: 'email-smtp',
        title: 'Email & SMTP Configuration',
        description: 'SMTP host, port (587/465), TLS/SSL, sending domain, sender name & bounce handling configuration.',
        href: '/admin/communication',
        badge: 'SMTP Verified',
        badgeType: 'success',
        params: ['Host: smtp.sendgrid.net', 'Port: 587 (TLS)', 'From: notifications@greenwood.edu.pk'],
        icon: <MessageSquare className="w-4 h-4 text-sky-600" />,
      },
      {
        id: 'biometric-integration',
        title: 'Biometric Attendance Machines',
        description: 'ZKTeco / Hikvision / Realtime biometric machine IP addresses, push SDK sync port & real-time attendance polling service.',
        href: '/admin/attendance',
        badge: '3 Devices Online',
        badgeType: 'success',
        params: ['Device 1: Main Gate (192.168.1.201)', 'Device 2: Staff Room (192.168.1.202)', 'Port: 4370 (Push SDK)'],
        icon: <Cpu className="w-4 h-4 text-indigo-600" />,
      },
      {
        id: 'rfid-integration',
        title: 'RFID & Smart Card Integration',
        description: 'RFID reader frequency, gate attendance turnstiles, bus check-in / check-out scanners & duplicate swipe filter.',
        href: '/admin/attendance',
        badge: 'RFID Active',
        badgeType: 'default',
        params: ['Frequency: 13.56 MHz (Mifare)', 'Turnstile Gate Sync', 'Duplicate Swipe Debounce: 60s'],
        icon: <Radio className="w-4 h-4 text-amber-600" />,
      },
      {
        id: 'face-attendance',
        title: 'Face Attendance Integration',
        description: 'AI facial recognition terminal sync, photo enrollment sync & live anti-spoofing temperature check integration.',
        href: '/admin/attendance',
        badge: 'AI Terminals Ready',
        badgeType: 'info',
        params: ['Facial Match Threshold: 98.5%', 'Anti-Spoofing Active', 'Photo Auto-Enrollment Sync'],
        icon: <ScanFace className="w-4 h-4 text-purple-600" />,
      },
      {
        id: 'payment-gateway-api',
        title: 'Payment Gateway Integration',
        description: '1Link 1BILL biller code, KuickPay merchant credentials, JazzCash / EasyPaisa IPN webhooks & reconciliation.',
        href: '/admin/billing',
        badge: '1Link • KuickPay',
        badgeType: 'success',
        params: ['1Link Biller Code: 100482', 'KuickPay Institution ID: 9482', 'IPN Webhook Listener Active'],
        icon: <CreditCard className="w-4 h-4 text-emerald-600" />,
      },
      {
        id: 'api-webhooks',
        title: 'API / Integration Settings',
        description: 'Third-party integration API keys, webhook endpoints, rate limits & bearer token management.',
        href: '/admin/settings/roles',
        badge: 'Bearer Auth',
        badgeType: 'default',
        params: ['REST API v1 Enabled', 'Webhook Subscriptions (4)', 'Rate Limit: 120 req/min'],
        icon: <Server className="w-4 h-4 text-slate-600" />,
      },
      {
        id: 'audit-security',
        title: 'Audit & Security Settings',
        description: 'Password complexity policies, session idle timeout, IP whitelist, failed login lockouts & immutable system audit trail.',
        href: '/admin/settings/roles',
        badge: 'Audit Active',
        badgeType: 'success',
        params: ['Password: 8+ chars (Alphanumeric)', 'Idle Timeout: 30m', 'Immutable Audit Trail', 'Daily Backup: 02:00 AM'],
        icon: <ShieldCheck className="w-4 h-4 text-blue-600" />,
      },
    ],
  },
];

export default function AdministrationConfigurationPage() {
  const [activeTabId, setActiveTabId] = useState('org-school');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHierarchyExpanded, setIsHierarchyExpanded] = useState(false);
  const [activeTimetableProfile, setActiveTimetableProfile] = useState('NORMAL');

  // Selected Active Tab
  const activeTab = useMemo(() => {
    return CONFIG_TABS.find((t) => t.id === activeTabId) || CONFIG_TABS[0];
  }, [activeTabId]);

  // Filter cards based on search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return activeTab.cards;
    const q = searchQuery.toLowerCase().trim();
    return activeTab.cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.params && c.params.some((p) => p.toLowerCase().includes(q)))
    );
  }, [activeTab, searchQuery]);

  // Overall Master Card Count across all 12 tabs
  const totalCardsAcrossTabs = useMemo(() => {
    return CONFIG_TABS.reduce((sum, tab) => sum + tab.cards.length, 0);
  }, []);

  return (
    <div className="w-full space-y-3 pb-8">
      {/* 1. TOP HEADER & BREADCRUMB STRIP */}
      <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          {/* Breadcrumb with explicit Back to Dashboard */}
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 px-2.5 py-1 rounded-md transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 font-medium">Administration</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-bold">Configuration Control Center</span>
          </div>

          <div className="flex items-center gap-2.5 pt-0.5">
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Administration Configuration
            </h1>
            <span className="px-2 py-0.5 rounded text-3xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200/70 hidden sm:inline-flex items-center gap-1">
              <Sliders className="w-3 h-3 text-blue-600" />
              <span>{totalCardsAcrossTabs} Master Configurations</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium leading-normal">
            Configure institutional structure, academic rules, billing settings and system-wide master configurations.
          </p>
        </div>

        {/* Search / Filter for Current Tab */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Filter ${activeTab.label} settings...`}
              className="w-full bg-slate-50/90 hover:bg-slate-50 focus:bg-white border border-slate-200/90 rounded-lg ps-8 pe-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC MULTI-TIER ORGANIZATION HIERARCHY STRIP */}
      <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Institutional Multi-Tier Organization Progression
            </span>
            <span className="text-3xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 hidden sm:inline">
              Operational Management from Head Office Downwards
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsHierarchyExpanded(!isHierarchyExpanded)}
            className="text-3xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>{isHierarchyExpanded ? 'Hide Hierarchy Tree' : 'View Hierarchy Tree'}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isHierarchyExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dynamic Horizontal Progression Ribbon */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-2xs">
          {DEFAULT_HIERARCHY.map((node, idx) => (
            <React.Fragment key={idx}>
              <div
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 ${
                  node.isRootContext
                    ? 'bg-slate-50 border-slate-200/80 text-slate-700'
                    : 'bg-blue-50/40 border-blue-200/60 hover:border-blue-300 hover:bg-blue-50/80 text-slate-900'
                }`}
              >
                <div className="p-1 rounded bg-white border border-slate-200 shadow-2xs">
                  {node.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{node.level}</span>
                    {node.code && <span className="text-[9px] font-semibold text-slate-500">[{node.code}]</span>}
                    {node.isRootContext && (
                      <span className="text-[9px] font-extrabold text-blue-600 bg-blue-100/70 px-1 rounded">Root Context</span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[150px] sm:max-w-[180px]">
                    {node.name}
                  </p>
                </div>
              </div>

              {idx < DEFAULT_HIERARCHY.length - 1 && (
                <div className="text-slate-300 shrink-0 font-bold px-0.5">
                  &rarr;
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Collapsible Hierarchy Architecture Explorer */}
        {isHierarchyExpanded && (
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-2 animate-in fade-in duration-150">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-xs">Hierarchy Scalability Architecture</p>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    Active Multi-Branch Structure
                  </span>
                </div>
                <p className="text-3xs text-slate-500">
                  Root Organization (<span className="font-semibold text-slate-700">Al-Falah Educational Network</span>) provides parent brand governance. School administration manages <span className="font-semibold text-slate-700">Head Offices &rarr; Regions &rarr; Zones &rarr; Campuses</span> directly.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href="/admin/settings/profile">
                  <Button variant="outline" size="sm" className="h-7 text-3xs font-bold px-2.5">
                    Manage Head Offices
                  </Button>
                </Link>
                <Link href="/admin/settings/profile">
                  <Button variant="primary" size="sm" className="h-7 text-3xs font-bold px-2.5">
                    Manage Campuses
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. ONE HORIZONTAL CONFIGURATION TAB ROW (12 TABS) */}
      <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs p-1.5">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
          {CONFIG_TABS.map((tab) => {
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTabId(tab.id);
                  setSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-500'}>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-blue-700/80 text-white' : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {tab.cards.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. ACTIVE TAB CONTENT HEADER (SINGLE TAB DISPLAY) */}
      <div className="w-full bg-slate-100/60 rounded-xl border border-slate-200/80 p-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
            {activeTab.icon}
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">{activeTab.label} Configuration</h2>
            <p className="text-3xs text-slate-500 leading-tight">{activeTab.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-3xs font-semibold text-slate-500 shrink-0">
          <span>Displaying {filteredCards.length} of {activeTab.cards.length} configurations</span>
          {searchQuery && (
            <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Filtered
            </span>
          )}
        </div>
      </div>

      {/* SPECIAL SUB-HEADER FOR TIMETABLE TAB (PROFILE SWITCHER) */}
      {activeTabId === 'timetable' && (
        <div className="w-full bg-white rounded-xl border border-amber-200/80 shadow-2xs p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-amber-50/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">Multi-Profile Timetable Policy Engine</p>
              <p className="text-3xs text-slate-500">Configure scheduling parameters per seasonal profile. Schedule generation is executed in the Timetable Module.</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-3xs font-bold overflow-x-auto shrink-0">
            {[
              { id: 'NORMAL', label: 'Standard Schedule' },
              { id: 'RAMADAN', label: 'Ramadan Timetable' },
              { id: 'SUMMER', label: 'Summer Timings' },
              { id: 'WINTER', label: 'Winter Timings' },
              { id: 'EXAM', label: 'Exam Windows' },
            ].map((prof) => (
              <button
                key={prof.id}
                type="button"
                onClick={() => setActiveTimetableProfile(prof.id)}
                className={`px-2.5 py-1 rounded transition-all whitespace-nowrap cursor-pointer ${
                  activeTimetableProfile === prof.id
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {prof.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SPECIAL BLUEPRINT FLOW FOR REPORTS & TEMPLATES TAB */}
      {activeTabId === 'reports-templates' && (
        <div className="w-full bg-white rounded-xl border border-teal-200/80 shadow-2xs p-3 space-y-2 bg-teal-50/20">
          <div className="flex items-center justify-between border-b border-teal-100 pb-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-700" />
              <p className="text-xs font-bold text-teal-900">Institutional Document & Report Card Mapping Studio Pipeline</p>
            </div>
            <span className="px-2 py-0.5 rounded text-3xs font-extrabold bg-teal-100 text-teal-800 border border-teal-200">
              Preserve Original Layouts • PDF • Word • Excel
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-2xs">
            {[
              { step: '01', title: 'Upload Template', desc: 'Upload existing school report card or certificate', icon: <Upload className="w-3.5 h-3.5 text-blue-600" /> },
              { step: '02', title: 'Detect Fields', desc: 'Identify placeholder markers & bounding boxes', icon: <Eye className="w-3.5 h-3.5 text-indigo-600" /> },
              { step: '03', title: 'Map ERP Fields', desc: 'Link {{student.name}}, {{marks.total}}, {{grade}}', icon: <Network className="w-3.5 h-3.5 text-purple-600" /> },
              { step: '04', title: 'Live Preview', desc: 'Inspect rendered sample with real student data', icon: <FileCheck className="w-3.5 h-3.5 text-amber-600" /> },
              { step: '05', title: 'Publish & Print', desc: 'Batch generate signed PDFs & bulk transcripts', icon: <Printer className="w-3.5 h-3.5 text-emerald-600" /> },
            ].map((s, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-white border border-teal-200/80 flex flex-col justify-between space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400">STEP {s.step}</span>
                  {s.icon}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-3xs">{s.title}</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. CONFIGURATION CARDS GRID (NO INTERNAL SCROLLBARS) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
        {filteredCards.map((card) => (
          <div
            key={card.id}
            className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between space-y-3 hover:border-blue-300 hover:shadow-xs transition-all group"
          >
            <div className="space-y-2">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-start gap-2 min-w-0">
                  {card.icon && (
                    <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors shrink-0 mt-0.5">
                      {card.icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-tight">
                      {card.title}
                    </h3>
                  </div>
                </div>

                {card.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 whitespace-nowrap ${
                      card.badgeType === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : card.badgeType === 'warning'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : card.badgeType === 'info'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {card.badge}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-3xs text-slate-500 leading-relaxed min-h-[32px]">
                {card.description}
              </p>

              {/* Key Parameters Pills */}
              {card.params && card.params.length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1">
                  {card.params.map((param, pIdx) => (
                    <span
                      key={pIdx}
                      className="text-[9px] font-medium bg-slate-50 text-slate-600 border border-slate-200/70 px-1.5 py-0.5 rounded"
                    >
                      {param}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Card Action Link */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-3xs">
              <span className="font-semibold text-slate-400">Master Configuration</span>
              <Link
                href={card.href}
                className="font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1 hover:underline"
              >
                <span>Configure</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform rtl:rotate-180" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className="w-full bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No configuration items matched &ldquo;{searchQuery}&rdquo;</p>
          <p className="text-3xs text-slate-400">Try clearing the search query or switching to another configuration tab.</p>
          <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="mt-2 text-3xs h-7">
            Clear Filter
          </Button>
        </div>
      )}

      {/* 6. CONTEXTUAL QUICK ACTIONS BAR (BOTTOM) */}
      <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Administrative Quick Actions</p>
            <p className="text-3xs text-slate-500">Fast-track institutional management operations and global defaults.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <Link href="/admin/settings/profile">
            <Button variant="outline" size="sm" className="h-8 text-3xs font-bold flex items-center gap-1">
              <Plus className="w-3 h-3 text-blue-600" />
              <span>Add Head Office</span>
            </Button>
          </Link>
          <Link href="/admin/settings/profile">
            <Button variant="outline" size="sm" className="h-8 text-3xs font-bold flex items-center gap-1">
              <Plus className="w-3 h-3 text-indigo-600" />
              <span>Add Region</span>
            </Button>
          </Link>
          <Link href="/admin/settings/profile">
            <Button variant="outline" size="sm" className="h-8 text-3xs font-bold flex items-center gap-1">
              <Plus className="w-3 h-3 text-emerald-600" />
              <span>Add Branch</span>
            </Button>
          </Link>
          <Link href="/admin/settings/academic-years">
            <Button variant="outline" size="sm" className="h-8 text-3xs font-bold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-600" />
              <span>Manage Academic Year</span>
            </Button>
          </Link>
          <Link href="/admin/settings/profile">
            <Button variant="outline" size="sm" className="h-8 text-3xs font-bold flex items-center gap-1">
              <Building className="w-3 h-3 text-sky-600" />
              <span>View Branches</span>
            </Button>
          </Link>
          <Link href="/admin/settings/roles">
            <Button variant="primary" size="sm" className="h-8 text-3xs font-bold flex items-center gap-1">
              <Settings className="w-3 h-3" />
              <span>System Settings</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
