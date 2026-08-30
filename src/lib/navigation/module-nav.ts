import {
  FileText,
  UserPlus,
  CheckCircle,
  HelpCircle,
  Users,
  Calendar,
  DollarSign,
  Award,
  BookOpen,
  Package,
  Send,
  Sliders,
  History,
  BarChart3,
  LucideIcon,
  CreditCard,
  Receipt,
  FileCheck,
  Building,
  GraduationCap,
  Layers,
  ArrowRightLeft,
  UserCheck,
  RefreshCw,
  FolderLock,
  MessageSquare,
  Bell,
  Clock,
  Briefcase,
  Shield,
} from 'lucide-react';

export interface SubNavItem {
  id: string;
  label: string;
  labelUr: string;
  href: string;
  icon: LucideIcon;
  isAudit?: boolean;
  isReports?: boolean;
}

export interface ModuleNavConfig {
  moduleCode: string;
  moduleName: string;
  moduleNameUr: string;
  basePath: string;
  items: SubNavItem[];
}

/**
 * Canonical Module Sub-Navigation Configurations.
 * Every major ERP module defines its workflow steps, followed by module history/audit,
 * and the LAST item is ALWAYS "Reports & Analytics".
 */
export const MODULE_NAV_CONFIGS: Record<string, ModuleNavConfig> = {
  admissions: {
    moduleCode: 'ADMISSIONS',
    moduleName: 'Admissions',
    moduleNameUr: 'داخلہ جات',
    basePath: '/admin/admissions',
    items: [
      { id: 'inquiry', label: 'Inquiry', labelUr: 'استفسارات', href: '/admin/admissions', icon: HelpCircle },
      { id: 'registration', label: 'Registration', labelUr: 'رجسٹریشن', href: '/admin/admissions/registration', icon: FileText },
      { id: 'test', label: 'Admission Test', labelUr: 'ٹیسٹ', href: '/admin/admissions/test', icon: FileCheck },
      { id: 'interview', label: 'Interview', labelUr: 'انٹرویو', href: '/admin/admissions/interview', icon: Users },
      { id: 'approved', label: 'Approved Admissions', labelUr: 'منظور شدہ', href: '/admin/admissions/approved', icon: CheckCircle },
      { id: 'confirmation', label: 'Admission Confirmation', labelUr: 'داخلہ تصدیق', href: '/admin/admissions/confirmation', icon: UserPlus },
      { id: 'audit', label: 'Admission Audit & History', labelUr: 'داخلہ ہسٹری و آڈٹ', href: '/admin/admissions/audit', icon: History, isAudit: true },
      { id: 'reports', label: 'Reports & Analytics', labelUr: 'رپورٹس و تجزیات', href: '/admin/admissions/reports', icon: BarChart3, isReports: true },
    ],
  },
  students: {
    moduleCode: 'STUDENTS',
    moduleName: 'Students',
    moduleNameUr: 'طلباء',
    basePath: '/admin/students',
    items: [
      { id: 'list', label: 'Student List', labelUr: 'طلباء فہرست', href: '/admin/students', icon: Users },
      { id: 'profile', label: 'Student Profile', labelUr: 'پروفائل', href: '/admin/students/profile', icon: GraduationCap },
      { id: 'bulk', label: 'Bulk Operations', labelUr: 'اجتماعی آپریشنز', href: '/admin/students/bulk', icon: Layers },
      { id: 'promotion', label: 'Class Promotion', labelUr: 'کلاس ترقی', href: '/admin/students/promotion', icon: Award },
      { id: 'transfer', label: 'Transfer / Withdrawal', labelUr: 'تبادلہ و اخراج', href: '/admin/students/transfer-withdrawal', icon: ArrowRightLeft },
      { id: 'audit', label: 'Student History & Audit', labelUr: 'طلباء ہسٹری و آڈٹ', href: '/admin/students/audit', icon: History, isAudit: true },
      { id: 'reports', label: 'Reports & Analytics', labelUr: 'رپورٹس و تجزیات', href: '/admin/students/reports', icon: BarChart3, isReports: true },
    ],
  },
  academics: {
    moduleCode: 'ACADEMICS',
    moduleName: 'Academics',
    moduleNameUr: 'تعلیمی امور',
    basePath: '/admin/academics',
    items: [
      { id: 'classes', label: 'Classes & Sections', labelUr: 'کلاسز و سیکشنز', href: '/admin/academics', icon: BookOpen },
      { id: 'subjects', label: 'Subjects & Curriculum', labelUr: 'مضامین و نصاب', href: '/admin/academics/subjects', icon: FileText },
      { id: 'timetable', label: 'Timetable & Periods', labelUr: 'ٹائم ٹیبل', href: '/admin/academics/timetable', icon: Clock },
      { id: 'audit', label: 'Academics Audit', labelUr: 'تعلیمی آڈٹ', href: '/admin/academics/audit', icon: History, isAudit: true },
      { id: 'reports', label: 'Reports & Analytics', labelUr: 'رپورٹس و تجزیات', href: '/admin/academics/reports', icon: BarChart3, isReports: true },
    ],
  },
  attendance: {
    moduleCode: 'ATTENDANCE',
    moduleName: 'Attendance',
    moduleNameUr: 'حاضری',
    basePath: '/admin/attendance',
    items: [
      { id: 'students', label: 'Student Attendance', labelUr: 'طلباء حاضری', href: '/admin/attendance', icon: UserCheck },
      { id: 'employees', label: 'Employee Attendance', labelUr: 'عملہ حاضری', href: '/admin/attendance/employees', icon: Users },
      { id: 'corrections', label: 'Corrections & History', labelUr: 'حاضری درستگی و تاریخ', href: '/admin/attendance/corrections', icon: RefreshCw },
      { id: 'audit', label: 'Attendance Audit', labelUr: 'حاضری آڈٹ', href: '/admin/attendance/audit', icon: History, isAudit: true },
      { id: 'reports', label: 'Reports & Analytics', labelUr: 'رپورٹس و تجزیات', href: '/admin/attendance/reports', icon: BarChart3, isReports: true },
    ],
  },
  billing: {
    moduleCode: 'BILLING',
    moduleName: 'Fees & Billing',
    moduleNameUr: 'فیس و بلنگ',
    basePath: '/admin/billing',
    items: [
      { id: 'setup', label: 'Fee Structure Setup', labelUr: 'فیس ڈھانچہ', href: '/admin/billing', icon: DollarSign },
      { id: 'discounts', label: 'Discounts & Scholarships', labelUr: 'رعایات و وظائف', href: '/admin/billing/discounts', icon: Award },
      { id: 'installments', label: 'Installment Plans', labelUr: 'اقساط پلان', href: '/admin/billing/installments', icon: Layers },
      { id: 'generation', label: 'Fee Generation', labelUr: 'فیس بلنگ کا اجراء', href: '/admin/billing/generation', icon: FileCheck },
      { id: 'bulk', label: 'Bulk Fee Operations', labelUr: 'بلک آپریشنز', href: '/admin/billing/bulk', icon: RefreshCw },
      { id: 'collection', label: 'Fee Collection', labelUr: 'فیس وصولی', href: '/admin/billing/collection', icon: CreditCard },
      { id: 'reconciliation', label: 'Bank Reconciliation', labelUr: 'بینک مصالحت', href: '/admin/billing/reconciliation', icon: Building },
      { id: 'vouchers', label: 'Voucher Management', labelUr: 'واؤچر منیجمنٹ', href: '/admin/billing/vouchers', icon: Receipt },
      { id: 'audit', label: 'Billing Audit Trail', labelUr: 'بلنگ آڈٹ ٹریل', href: '/admin/billing/audit', icon: History, isAudit: true },
      { id: 'reports', label: 'Reports & Analytics', labelUr: 'رپورٹس و تجزیات', href: '/admin/billing/reports', icon: BarChart3, isReports: true },
    ],
  },
  exams: {
    moduleCode: 'EXAMS',
    moduleName: 'Examinations',
    moduleNameUr: 'امتحانات',
    basePath: '/admin/exams',
    items: [
      { id: 'setup', label: 'Exam Setup & Terms', labelUr: 'امتحانی شیڈول', href: '/admin/exams', icon: Calendar },
      { id: 'marks', label: 'Marks Entry', labelUr: 'نمبرات کا اندراج', href: '/admin/exams/marks', icon: FileCheck },
      { id: 'processing', label: 'Result Processing', labelUr: 'نتائج تیاری', href: '/admin/exams/processing', icon: Award },
      { id: 'publishing', label: 'Result Publishing', labelUr: 'نتائج کی اشاعت', href: '/admin/exams/publishing', icon: Send },
      { id: 'audit', label: 'Exam Audit Trail', labelUr: 'امتحانی آڈٹ ٹریل', href: '/admin/exams/audit', icon: History, isAudit: true },
      { id: 'reports', label: 'Reports & Analytics', labelUr: 'رپورٹس و تجزیات', href: '/admin/exams/reports', icon: BarChart3, isReports: true },
    ],
  },
  hr: {
    moduleCode: 'HR_PAYROLL',
    moduleName: 'HR & Payroll',
    moduleNameUr: 'عملہ و پے رول',
    basePath: '/admin/hr',
    items: [
      { id: 'employees', label: 'Employees & Faculty', labelUr: 'ملازمین و اساتذہ', href: '/admin/hr', icon: Users },
      { id: 'attendance', label: 'Attendance & Time', labelUr: 'ٹائم و حاضری', href: '/admin/hr/attendance', icon: Clock },
      { id: 'leave', label: 'Leave Management', labelUr: 'رخصت منیجمنٹ', href: '/admin/hr/leave', icon: Calendar },
      { id: 'payroll', label: 'Payroll Processing', labelUr: 'تنخواہ کی تیاری', href: '/admin/hr/payroll', icon: DollarSign },
      { id: 'payslips', label: 'Payslips & Publishing', labelUr: 'پے سلپ اشاعت', href: '/admin/hr/payslips', icon: Send },
      { id: 'audit', label: 'HR / Payroll Audit', labelUr: 'پے رول آڈٹ', href: '/admin/hr/audit', icon: History, isAudit: true },
      { id: 'reports', label: 'Reports & Analytics', labelUr: 'رپورٹس و تجزیات', href: '/admin/hr/reports', icon: BarChart3, isReports: true },
    ],
  },
  accounts: {
    moduleCode: 'ACCOUNTS',
    moduleName: 'Accounts & Ledger',
    moduleNameUr: 'اکاؤنٹس و کھاتہ',
    basePath: '/admin/accounts',
    items: [
      { id: 'chart', label: 'Chart of Accounts', labelUr: 'کھاتہ جات چارٹ', href: '/admin/accounts', icon: Layers },
      { id: 'vouchers', label: 'Journal Vouchers', labelUr: 'جنرل واؤچرز', href: '/admin/accounts/vouchers', icon: Receipt },
      { id: 'cash-bank', label: 'Cash & Bank Books', labelUr: 'کیش و بینک', href: '/admin/accounts/cash-bank', icon: DollarSign },
      { id: 'reconciliation', label: 'Bank Reconciliation', labelUr: 'بینک مصالحت', href: '/admin/accounts/reconciliation', icon: Building },
      { id: 'ledger', label: 'General Ledger', labelUr: 'جنرل لیجر', href: '/admin/accounts/ledger', icon: FileText },
      { id: 'statements', label: 'Financial Statements', labelUr: 'مالیاتی گوشوارے', href: '/admin/accounts/statements', icon: Briefcase },
      { id: 'audit', label: 'Accounts Audit Trail', labelUr: 'اکاؤنٹس آڈٹ ٹریل', href: '/admin/accounts/audit', icon: History, isAudit: true },
      { id: 'reports', label: 'Reports & Analytics', labelUr: 'رپورٹس و تجزیات', href: '/admin/accounts/reports', icon: BarChart3, isReports: true },
    ],
  },
  library: {
    moduleCode: 'LIBRARY',
    moduleName: 'Library',
    moduleNameUr: 'لائبریری',
    basePath: '/admin/library',
    items: [
      { id: 'books', label: 'Books Catalog', labelUr: 'کتب کیٹلاگ', href: '/admin/library', icon: BookOpen },
      { id: 'members', label: 'Library Members', labelUr: 'ارکان لائبریری', href: '/admin/library/members', icon: Users },
      { id: 'issue-return', label: 'Issue & Return', labelUr: 'اجراء و واپسی', href: '/admin/library/issue-return', icon: RefreshCw },
      { id: 'digital', label: 'Digital Library', labelUr: 'ڈیجیٹل لائبریری', href: '/admin/library/digital', icon: FolderLock },
      { id: 'audit', label: 'Library Audit', labelUr: 'لائبریری آڈٹ', href: '/admin/library/audit', icon: History, isAudit: true },
      { id: 'reports', label: 'Reports & Analytics', labelUr: 'رپورٹس و تجزیات', href: '/admin/library/reports', icon: BarChart3, isReports: true },
    ],
  },
  inventory: {
    moduleCode: 'INVENTORY',
    moduleName: 'Inventory',
    moduleNameUr: 'سامان و اسٹور',
    basePath: '/admin/inventory',
    items: [
      { id: 'items', label: 'Items Catalog', labelUr: 'اشیاء لسٹ', href: '/admin/inventory', icon: Package },
      { id: 'assets', label: 'Fixed Assets', labelUr: 'مستقل اثاثہ جات', href: '/admin/inventory/assets', icon: Building },
      { id: 'procurement', label: 'Procurement & Purchase', labelUr: 'خریداری و پرچیز', href: '/admin/inventory/procurement', icon: Receipt },
      { id: 'stock', label: 'Stock Transactions', labelUr: 'اسٹاک ریکارڈ', href: '/admin/inventory/stock', icon: RefreshCw },
      { id: 'audit', label: 'Inventory Audit', labelUr: 'اسٹور آڈٹ', href: '/admin/inventory/audit', icon: History, isAudit: true },
      { id: 'reports', label: 'Reports & Analytics', labelUr: 'رپورٹس و تجزیات', href: '/admin/inventory/reports', icon: BarChart3, isReports: true },
    ],
  },
  communication: {
    moduleCode: 'COMMUNICATION',
    moduleName: 'Communication',
    moduleNameUr: 'پیغامات و اعلانات',
    basePath: '/admin/communication',
    items: [
      { id: 'notices', label: 'School Notices', labelUr: 'اعلانات و نوٹسز', href: '/admin/communication', icon: FileText },
      { id: 'messages', label: 'Direct Messages & SMS', labelUr: 'پیغامات و ایس ایم ایس', href: '/admin/communication/messages', icon: MessageSquare },
      { id: 'notifications', label: 'Portal Notifications', labelUr: 'اطلاعات', href: '/admin/communication/notifications', icon: Bell },
      { id: 'audit', label: 'Communication Audit', labelUr: 'پیغامات آڈٹ', href: '/admin/communication/audit', icon: History, isAudit: true },
      { id: 'reports', label: 'Reports & Analytics', labelUr: 'رپورٹس و تجزیات', href: '/admin/communication/reports', icon: BarChart3, isReports: true },
    ],
  },
  settings: {
    moduleCode: 'CONFIG',
    moduleName: 'Administration Configuration',
    moduleNameUr: 'انتظامی ترتیبات و کنٹرول',
    basePath: '/admin/settings',
    items: [
      { id: 'profile', label: 'School Profile', labelUr: 'اسکول پروفائل', href: '/admin/settings', icon: Building },
      { id: 'academic-years', label: 'Academic Years & Terms', labelUr: 'تعلیمی سال و ٹرمز', href: '/admin/settings/academic-years', icon: Calendar },
      { id: 'users-roles', label: 'Users & Roles Management', labelUr: 'صارفین و کردار', href: '/admin/settings/users-roles', icon: Users },
      { id: 'security', label: 'Security & Permissions', labelUr: 'سیکیورٹی و اجازتیں', href: '/admin/settings/security', icon: Shield },
      { id: 'modules', label: 'Feature Toggles', labelUr: 'ماڈیول ٹوگلز', href: '/admin/settings/modules', icon: Sliders },
      { id: 'audit', label: 'Master System Audit Trail', labelUr: 'ماسٹر سسٹم آڈٹ ٹریل', href: '/admin/settings/audit', icon: History, isAudit: true },
      { id: 'reports', label: 'Reports & Analytics', labelUr: 'رپورٹس و تجزیات', href: '/admin/settings/reports', icon: BarChart3, isReports: true },
    ],
  },
};

/**
 * Resolves the active module sub-navigation config based on current URL pathname.
 */
export function getActiveModuleConfig(pathname: string): ModuleNavConfig | null {
  const cleanPath = pathname.toLowerCase();
  const matchedKey = Object.keys(MODULE_NAV_CONFIGS).find((key) => {
    const config = MODULE_NAV_CONFIGS[key];
    return cleanPath === config.basePath || cleanPath.startsWith(`${config.basePath}/`);
  });

  return matchedKey ? MODULE_NAV_CONFIGS[matchedKey] : null;
}
