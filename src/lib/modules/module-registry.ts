import { ModuleCode, ModuleDefinition, ProductTier } from '../types';

/**
 * Canonical Module Registry
 * Single source of truth for all Base School ERP and Optional/Advanced Enterprise modules.
 */
export const MODULE_REGISTRY: Record<ModuleCode, ModuleDefinition> = {
  // -------------------------------------------------------------
  // BASE SCHOOL ERP MODULES (Always active in Base Tier)
  // -------------------------------------------------------------
  CONFIG: {
    code: 'CONFIG',
    nameEn: 'Administration Configuration',
    nameUr: 'انتظامی ترتیبات',
    descriptionEn: 'Institutional identity, academic sessions, classes, sections, and subjects.',
    category: 'SYSTEM',
    isBaseModule: true,
    defaultTiers: ['BASE', 'STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/settings',
    iconName: 'Sliders',
    features: [
      { key: 'SCHOOL_PROFILE', nameEn: 'School Profile', nameUr: 'اسکول پروفائل', descriptionEn: 'Institution branding, logo, contact, and localization.', isBaseFeature: true },
      { key: 'ACADEMIC_SESSIONS', nameEn: 'Academic Sessions', nameUr: 'تعلیمی سیشنز', descriptionEn: 'Academic terms, calendar dates, and session locking.', isBaseFeature: true },
      { key: 'CLASS_CATALOG', nameEn: 'Class Catalog', nameUr: 'کلاس لسٹ', descriptionEn: 'Categories, master classes, and classroom sections.', isBaseFeature: true },
      { key: 'SUBJECT_CURRICULUM', nameEn: 'Subject Curriculum', nameUr: 'مضامین و نصاب', descriptionEn: 'Master subjects and class-subject curriculum mapping.', isBaseFeature: true },
    ],
  },
  SECURITY: {
    code: 'SECURITY',
    nameEn: 'Security & Access Control',
    nameUr: 'سیکیورٹی اور اختیارات',
    descriptionEn: 'User accounts, role management, and 10-action permission matrix.',
    category: 'SYSTEM',
    isBaseModule: true,
    defaultTiers: ['BASE', 'STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/settings/roles',
    iconName: 'Shield',
    features: [
      { key: 'ROLES_PERMISSIONS', nameEn: 'Roles & Permissions', nameUr: 'اختیارات', descriptionEn: 'Role management and 10-action RBAC matrix.', isBaseFeature: true },
      { key: 'USER_SESSIONS', nameEn: 'Session Tracking', nameUr: 'سیشن ٹریکنگ', descriptionEn: 'Active user login sessions and security tokens.', isBaseFeature: true },
      { key: 'PASSWORD_POLICIES', nameEn: 'Password Policies', nameUr: 'پاس ورڈ پالیسی', descriptionEn: 'Lockout thresholds and password reset rules.', isBaseFeature: true },
    ],
  },
  STUDENTS: {
    code: 'STUDENTS',
    nameEn: 'Student Information System',
    nameUr: 'طلباء کا نظام',
    descriptionEn: 'Student profiles, parent linkage, active status, and classroom assignments.',
    category: 'ACADEMIC',
    isBaseModule: true,
    defaultTiers: ['BASE', 'STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/students',
    iconName: 'GraduationCap',
    features: [
      { key: 'STUDENT_DIRECTORY', nameEn: 'Student Directory', nameUr: 'طلباء ڈائریکٹری', descriptionEn: 'Student profiles, personal data, and guardian contacts.', isBaseFeature: true },
      { key: 'SECTION_ENROLLMENT', nameEn: 'Section Enrollment', nameUr: 'سیکشن اندراج', descriptionEn: 'Assign students to classes and classroom sections.', isBaseFeature: true },
      { key: 'STUDENT_CATEGORIES', nameEn: 'Categories & Houses', nameUr: 'کیٹیگریز و ہاؤسز', descriptionEn: 'Day scholars, boarders, and extracurricular house tags.', isBaseFeature: false },
      { key: 'STUDENT_PROMOTION', nameEn: 'Student Promotion', nameUr: 'طلباء پروموشن', descriptionEn: 'Session-end student promotion and roll number assignment.', isBaseFeature: true },
    ],
  },
  BILLING: {
    code: 'BILLING',
    nameEn: 'Fee Billing & Collections',
    nameUr: 'فیس بلنگ اور وصولی',
    descriptionEn: 'Fee structures, monthly voucher generation, payments, and receipts.',
    category: 'FINANCE',
    isBaseModule: true,
    defaultTiers: ['BASE', 'STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/billing',
    iconName: 'Receipt',
    features: [
      { key: 'FEE_VOUCHERS', nameEn: 'Fee Voucher Generation', nameUr: 'فیس واؤچرز', descriptionEn: 'Monthly voucher generation and fee heads.', isBaseFeature: true },
      { key: 'FEE_COLLECTION', nameEn: 'Fee Collection & Receipts', nameUr: 'وصولی و رسیدیں', descriptionEn: 'Payment recording, receipt generation, and ledger updates.', isBaseFeature: true },
      { key: 'INSTALLMENT_PLANS', nameEn: 'Installment Plans', nameUr: 'اقساط پلان', descriptionEn: 'Split large fee amounts into multi-month installments.', isBaseFeature: false, dependsOn: ['FEE_VOUCHERS'] },
      { key: 'SCHOLARSHIPS', nameEn: 'Discounts & Scholarships', nameUr: 'رعایت و وظائف', descriptionEn: 'Sibling concessions, staff discounts, and merit scholarships.', isBaseFeature: false },
      { key: 'SECURITY_DEPOSITS', nameEn: 'Security Deposits', nameUr: 'سیکیورٹی ڈپازٹ', descriptionEn: 'Refundable security deposit tracking and adjustments.', isBaseFeature: false },
      { key: 'BANK_RECONCILIATION', nameEn: 'Bank Reconciliation', nameUr: 'بینک ریکونسیلیشن', descriptionEn: 'Direct bank statement fee matching and 1Link verification.', isBaseFeature: false, dependsOn: ['FEE_COLLECTION'] },
    ],
  },
  ATTENDANCE: {
    code: 'ATTENDANCE',
    nameEn: 'Attendance Management',
    nameUr: 'حاضری کا نظام',
    descriptionEn: 'Daily roll call, student/staff attendance, absence logs, and parent alerts.',
    category: 'ACADEMIC',
    isBaseModule: true,
    defaultTiers: ['BASE', 'STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/attendance',
    iconName: 'CalendarCheck',
    features: [
      { key: 'MANUAL_ATTENDANCE', nameEn: 'Manual Roll Call', nameUr: 'دستی حاضری', descriptionEn: 'Teacher-marked classroom roll call and daily registers.', isBaseFeature: true },
      { key: 'ABSENCE_ALERTS', nameEn: 'Absence SMS/Notifications', nameUr: 'غیر حاضری پیغامات', descriptionEn: 'Automated alert triggers when a student is marked absent.', isBaseFeature: true },
      { key: 'LEAVE_APPLICATIONS', nameEn: 'Student Leave Requests', nameUr: 'رخصت درخواستیں', descriptionEn: 'Parent-submitted leave requests and teacher approvals.', isBaseFeature: false },
      { key: 'BIOMETRIC_SYNC', nameEn: 'Biometric Machine Sync', nameUr: 'بایومیٹرک مشین', descriptionEn: 'Real-time sync with fingerprint/RFID attendance hardware.', isBaseFeature: false },
    ],
  },
  HOMEWORK: {
    code: 'HOMEWORK',
    nameEn: 'Homework & Assignments',
    nameUr: 'ہوم ورک اور اسائنمنٹس',
    descriptionEn: 'Daily class homework, digital task publishing, and submissions.',
    category: 'ACADEMIC',
    isBaseModule: true,
    defaultTiers: ['BASE', 'STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/homework',
    iconName: 'BookOpen',
    features: [
      { key: 'DAILY_HOMEWORK', nameEn: 'Daily Homework Diary', nameUr: 'روزانہ ہوم ورک ڈائری', descriptionEn: 'Subject-wise homework publishing for students/parents.', isBaseFeature: true },
      { key: 'DIGITAL_SUBMISSION', nameEn: 'Online Submissions', nameUr: 'آن لائن جمع', descriptionEn: 'Student document/image upload for homework evaluation.', isBaseFeature: false },
    ],
  },
  EXAMS: {
    code: 'EXAMS',
    nameEn: 'Examinations & Results',
    nameUr: 'امتحانات اور نتائج',
    descriptionEn: 'Exam terms, marks entry, grading schemes, tabulation, and report cards.',
    category: 'ACADEMIC',
    isBaseModule: true,
    defaultTiers: ['BASE', 'STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/exams',
    iconName: 'FileCheck',
    features: [
      { key: 'EXAM_SCHEDULE', nameEn: 'Exam Datesheet & Terms', nameUr: 'امتحانی شیڈول', descriptionEn: 'Define examination terms, subjects, and datesheets.', isBaseFeature: true },
      { key: 'MARKS_ENTRY', nameEn: 'Teacher Marks Entry', nameUr: 'نمبرات کا اندراج', descriptionEn: 'Subject-wise theory and practical marks recording.', isBaseFeature: true },
      { key: 'GRADING_SCHEMES', nameEn: 'Grading & Passing Rules', nameUr: 'گریڈنگ اور پاسنگ اصول', descriptionEn: 'Percentage, Letter Grade, GPA bands, and passing criteria.', isBaseFeature: true },
      { key: 'RESULT_CARDS', nameEn: 'Report Cards & Tabulation', nameUr: 'رزلٹ کارڈز', descriptionEn: 'Automated term report cards and class tabulation sheets.', isBaseFeature: true, dependsOn: ['MARKS_ENTRY', 'GRADING_SCHEMES'] },
    ],
  },
  HR_PAYROLL: {
    code: 'HR_PAYROLL',
    nameEn: 'Staff & Basic Payroll',
    nameUr: 'عملہ اور بنیادی تنخواہ',
    descriptionEn: 'Employee directory, salary structure, monthly payroll processing, and employee payslips.',
    category: 'ADMINISTRATION',
    isBaseModule: true,
    defaultTiers: ['BASE', 'STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/hr-payroll',
    iconName: 'CreditCard',
    features: [
      { key: 'EMPLOYEE_DIRECTORY', nameEn: 'Staff Directory', nameUr: 'اسٹاف ڈائریکٹری', descriptionEn: 'Teacher and employee master profiles and designations.', isBaseFeature: true },
      { key: 'BASIC_SALARY', nameEn: 'Basic Salary Structure', nameUr: 'تنخواہ کا ڈھانچہ', descriptionEn: 'Standard allowances and deductions per employee.', isBaseFeature: true, dependsOn: ['EMPLOYEE_DIRECTORY'] },
      { key: 'MONTHLY_PAYROLL', nameEn: 'Monthly Payroll Run', nameUr: 'ماہانہ تنخواہ پروسیسنگ', descriptionEn: 'Monthly salary calculation and payroll ledger generation.', isBaseFeature: true, dependsOn: ['BASIC_SALARY'] },
      { key: 'PAYSLIPS', nameEn: 'Staff Payslips', nameUr: 'پے سلپس', descriptionEn: 'Individual printable and digital staff payslips.', isBaseFeature: true, dependsOn: ['MONTHLY_PAYROLL'] },
      { key: 'STAFF_LEAVES', nameEn: 'Leave Management', nameUr: 'اسٹاف رخصتیں', descriptionEn: 'Staff leave quotas, requests, and approval workflow.', isBaseFeature: false },
    ],
  },
  COMMUNICATION: {
    code: 'COMMUNICATION',
    nameEn: 'Notices & Communication',
    nameUr: 'اعلانات اور پیغامات',
    descriptionEn: 'Circular notices, SMS notifications, and general announcements.',
    category: 'ADMINISTRATION',
    isBaseModule: true,
    defaultTiers: ['BASE', 'STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/communication',
    iconName: 'Send',
    features: [
      { key: 'PORTAL_NOTICES', nameEn: 'School Circulars & Notices', nameUr: 'اسکول نوٹسز', descriptionEn: 'Publish notices to student, teacher, and parent portals.', isBaseFeature: true },
      { key: 'SMS_GATEWAY', nameEn: 'SMS Gateway Integration', nameUr: 'ایس ایم ایس گیٹ وے', descriptionEn: 'Send branded bulk SMS to parents and guardians.', isBaseFeature: false },
      { key: 'EMAIL_ALERTS', nameEn: 'Email Notifications', nameUr: 'ای میل پیغامات', descriptionEn: 'Automated email alerts for billing, notices, and exams.', isBaseFeature: false },
      { key: 'WHATSAPP_GATEWAY', nameEn: 'WhatsApp Business API', nameUr: 'واٹس ایپ انٹیگریشن', descriptionEn: 'Direct WhatsApp voucher and notice dispatch.', isBaseFeature: false },
    ],
  },
  REPORTS: {
    code: 'REPORTS',
    nameEn: 'Reports & Analytics',
    nameUr: 'رپورٹس اور تجزیات',
    descriptionEn: 'Standard academic, financial, attendance, and administrative reports.',
    category: 'SYSTEM',
    isBaseModule: true,
    defaultTiers: ['BASE', 'STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/reports',
    iconName: 'BarChart3',
    features: [
      { key: 'STANDARD_REPORTS', nameEn: 'Standard Report Suite', nameUr: 'معیاری رپورٹس', descriptionEn: 'Pre-built tabular and summary reports across enabled modules.', isBaseFeature: true },
      { key: 'EXPORT_ENGINE', nameEn: 'PDF & Excel Export', nameUr: 'ایکسپورٹ انجن', descriptionEn: 'Download structured reports in CSV, Excel, and printable PDF.', isBaseFeature: true },
    ],
  },
  PUBLISHING: {
    code: 'PUBLISHING',
    nameEn: 'Publishing Engine',
    nameUr: 'اشاعت کا نظام',
    descriptionEn: 'Central draft-to-published state engine for vouchers, results, and circulars.',
    category: 'SYSTEM',
    isBaseModule: true,
    defaultTiers: ['BASE', 'STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/publishing',
    iconName: 'CheckCircle',
    features: [
      { key: 'STATUS_WORKFLOW', nameEn: 'Draft & Publish Workflow', nameUr: 'ڈرافٹ و اشاعت', descriptionEn: 'Multi-stage publishing control for official documents.', isBaseFeature: true },
      { key: 'BULK_PUBLISH', nameEn: 'Batch Publishing Engine', nameUr: 'بلک اشاعت', descriptionEn: 'Publish thousands of fee vouchers or result cards in one click.', isBaseFeature: true },
    ],
  },
  AUDIT: {
    code: 'AUDIT',
    nameEn: 'System Audit Trail',
    nameUr: 'آڈٹ اور سرگرمی لاگ',
    descriptionEn: 'Immutable logging of system operations, edits, status changes, and reversals.',
    category: 'SYSTEM',
    isBaseModule: true,
    defaultTiers: ['BASE', 'STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/audit',
    iconName: 'History',
    features: [
      { key: 'CHANGE_LOGGING', nameEn: 'Mutation & Edit Logging', nameUr: 'تبدیلیوں کا لاگ', descriptionEn: 'Tracks before/after values of database modifications.', isBaseFeature: true },
      { key: 'SECURITY_AUDIT', nameEn: 'Security & Access Logs', nameUr: 'سیکیورٹی آڈٹ لاگ', descriptionEn: 'Tracks login history, failed attempts, and role mutations.', isBaseFeature: true },
    ],
  },

  // -------------------------------------------------------------
  // OPTIONAL / ADVANCED ENTERPRISE MODULES (Config-Toggled)
  // -------------------------------------------------------------
  ADMISSIONS: {
    code: 'ADMISSIONS',
    nameEn: 'Admissions & Inquiries',
    nameUr: 'داخلہ جات اور استفسارات',
    descriptionEn: 'Online inquiries, candidate registration, entry tests, merit lists, and interviews.',
    category: 'ACADEMIC',
    isBaseModule: false,
    defaultTiers: ['STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/admissions',
    iconName: 'UserPlus',
    features: [
      { key: 'ONLINE_INQUIRY', nameEn: 'Inquiry Management', nameUr: 'استفسارات', descriptionEn: 'Record and track prospective student inquiries.', isBaseFeature: true },
      { key: 'APPLICANT_REGISTRATION', nameEn: 'Applicant Registration', nameUr: 'امیدوار رجسٹریشن', descriptionEn: 'Issue admission forms and collect candidate records.', isBaseFeature: true },
      { key: 'ADMISSION_TESTS', nameEn: 'Entry Tests & Merit', nameUr: 'داخلہ ٹیسٹ و میرٹ لسٹ', descriptionEn: 'Schedule tests, enter marks, and generate merit lists.', isBaseFeature: false },
      { key: 'INTERVIEW_WORKFLOW', nameEn: 'Interview & Offers', nameUr: 'انٹرویو و آفر لیٹرز', descriptionEn: 'Panel interview scheduling and formal admission offer letters.', isBaseFeature: false },
    ],
  },
  ADVANCED_HR: {
    code: 'ADVANCED_HR',
    nameEn: 'Advanced HR & Appraisals',
    nameUr: 'اعلیٰ انسانی وسائل',
    descriptionEn: 'Job postings, applicant tracking, performance appraisals, and leave quota policies.',
    category: 'ADMINISTRATION',
    isBaseModule: false,
    defaultTiers: ['FULL', 'ENTERPRISE'],
    basePath: '/admin/advanced-hr',
    iconName: 'Briefcase',
    dependsOn: ['HR_PAYROLL'],
    features: [
      { key: 'JOB_RECRUITMENT', nameEn: 'Job Postings & Applicants', nameUr: 'ملازمتوں کا اشتہار', descriptionEn: 'Track candidate CVs and hiring stages.', isBaseFeature: true },
      { key: 'STAFF_APPRAISALS', nameEn: 'Performance Appraisals', nameUr: 'کارکردگی کا جائزہ', descriptionEn: 'Annual teacher KPI evaluations and review metrics.', isBaseFeature: false },
    ],
  },
  ADVANCED_PAYROLL: {
    code: 'ADVANCED_PAYROLL',
    nameEn: 'Advanced Payroll & Loans',
    nameUr: 'اعلیٰ پے رول اور قرضے',
    descriptionEn: 'Staff loan management, salary advances, income tax slabs, arrears, and overtime rules.',
    category: 'FINANCE',
    isBaseModule: false,
    defaultTiers: ['FULL', 'ENTERPRISE'],
    basePath: '/admin/advanced-payroll',
    iconName: 'DollarSign',
    dependsOn: ['HR_PAYROLL'],
    features: [
      { key: 'STAFF_LOANS', nameEn: 'Staff Loans & Deductions', nameUr: 'اسٹاف قرضے', descriptionEn: 'Multi-month loan disbursements and salary deduction schedules.', isBaseFeature: true },
      { key: 'SALARY_ADVANCES', nameEn: 'Salary Advances', nameUr: 'پیشگی تنخواہ', descriptionEn: 'Mid-month advance salary requests and automated deductions.', isBaseFeature: true },
      { key: 'TAX_SLABS', nameEn: 'Income Tax Slabs', nameUr: 'انکم ٹیکس سلیبس', descriptionEn: 'Statutory tax deductions computed on taxable brackets.', isBaseFeature: false },
      { key: 'OVERTIME_HOURLY', nameEn: 'Overtime & Hourly Pay', nameUr: 'اوور ٹائم ریکارڈ', descriptionEn: 'Calculate pay for additional teaching or operational hours.', isBaseFeature: false },
    ],
  },
  ACCOUNTS: {
    code: 'ACCOUNTS',
    nameEn: 'Chart of Accounts & Ledgers',
    nameUr: 'اکاؤنٹس اور لیجر',
    descriptionEn: 'Double-entry general ledger, journal vouchers, trial balance, and balance sheet.',
    category: 'FINANCE',
    isBaseModule: false,
    defaultTiers: ['FULL', 'ENTERPRISE'],
    basePath: '/admin/accounts',
    iconName: 'Building',
    features: [
      { key: 'CHART_OF_ACCOUNTS', nameEn: 'Chart of Accounts', nameUr: 'کھاتہ جات کی لسٹ', descriptionEn: 'Tree structure of Assets, Liabilities, Equity, Income, Expense.', isBaseFeature: true },
      { key: 'JOURNAL_VOUCHERS', nameEn: 'Journal Entries & Vouchers', nameUr: 'جرنل واؤچرز', descriptionEn: 'Post double-entry journal vouchers with debit/credit balance validation.', isBaseFeature: true, dependsOn: ['CHART_OF_ACCOUNTS'] },
      { key: 'FINANCIAL_STATEMENTS', nameEn: 'Trial Balance & Balance Sheet', nameUr: 'مالیاتی گوشوارے', descriptionEn: 'Live Trial Balance, Profit & Loss Statement, and Balance Sheet.', isBaseFeature: true, dependsOn: ['JOURNAL_VOUCHERS'] },
    ],
  },
  BUDGET: {
    code: 'BUDGET',
    nameEn: 'Budgeting & Expenditure',
    nameUr: 'بجٹ اور اخراجات',
    descriptionEn: 'Annual budget allocation, departmental spending control, and variance tracking.',
    category: 'FINANCE',
    isBaseModule: false,
    defaultTiers: ['ENTERPRISE'],
    basePath: '/admin/budget',
    iconName: 'CreditCard',
    dependsOn: ['ACCOUNTS'],
    features: [
      { key: 'ANNUAL_BUDGET', nameEn: 'Annual Budget Planning', nameUr: 'سالانہ بجٹ پلان', descriptionEn: 'Set departmental spending caps across financial accounts.', isBaseFeature: true },
      { key: 'VARIANCE_ANALYSIS', nameEn: 'Budget vs Actuals Tracking', nameUr: 'بجٹ جائزہ و فرق', descriptionEn: 'Track actual expenditures against allocated budget limits.', isBaseFeature: true, dependsOn: ['ANNUAL_BUDGET'] },
    ],
  },
  LIBRARY: {
    code: 'LIBRARY',
    nameEn: 'Library Management',
    nameUr: 'لائبریری کا نظام',
    descriptionEn: 'Book cataloging, barcode management, student/staff issue and return, and overdue fines.',
    category: 'RESOURCES',
    isBaseModule: false,
    defaultTiers: ['STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/library',
    iconName: 'BookOpen',
    features: [
      { key: 'BOOK_CATALOG', nameEn: 'Book Catalog & Accessions', nameUr: 'کتابوں کا اندراج', descriptionEn: 'Catalog titles, authors, categories, ISBNs, and shelf locations.', isBaseFeature: true },
      { key: 'CIRCULATION_DESK', nameEn: 'Issue & Return Circulation', nameUr: 'کتب اجراء و واپسی', descriptionEn: 'Issue books to students/staff with due date tracking.', isBaseFeature: true, dependsOn: ['BOOK_CATALOG'] },
      { key: 'OVERDUE_FINES', nameEn: 'Library Fines & Penalties', nameUr: 'لائبریری جرمانے', descriptionEn: 'Calculate and post late-return fines to student fee ledger.', isBaseFeature: false, dependsOn: ['CIRCULATION_DESK'] },
    ],
  },
  DIGITAL_LIBRARY: {
    code: 'DIGITAL_LIBRARY',
    nameEn: 'Digital Library & Media',
    nameUr: 'ڈیجیٹل لائبریری',
    descriptionEn: 'Digital e-books, past papers, lecture notes, and multimedia repository.',
    category: 'RESOURCES',
    isBaseModule: false,
    defaultTiers: ['FULL', 'ENTERPRISE'],
    basePath: '/admin/digital-library',
    iconName: 'FolderLock',
    dependsOn: ['LIBRARY'],
    features: [
      { key: 'EBOOKS_REPOSITORY', nameEn: 'E-Books & Document Storage', nameUr: 'ای بکس ذخیرہ', descriptionEn: 'Upload and organize PDF e-books and study resources.', isBaseFeature: true },
      { key: 'MULTIMEDIA_LECTURES', nameEn: 'Video & Audio Lectures', nameUr: 'ویڈیو لیکچرز', descriptionEn: 'Curated digital learning media for enrolled students.', isBaseFeature: false },
    ],
  },
  INVENTORY: {
    code: 'INVENTORY',
    nameEn: 'Inventory & Stock Control',
    nameUr: 'سامان اور انوینٹری',
    descriptionEn: 'Stock registry, consumption logs, store requisitions, and reorder levels.',
    category: 'RESOURCES',
    isBaseModule: false,
    defaultTiers: ['FULL', 'ENTERPRISE'],
    basePath: '/admin/inventory',
    iconName: 'Package',
    features: [
      { key: 'STOCK_ITEMS', nameEn: 'Item Catalog & Stock Levels', nameUr: 'اسٹاک اشیاء لسٹ', descriptionEn: 'Track consumable supplies, stationery, uniforms, and books.', isBaseFeature: true },
      { key: 'STOCK_TRANSACTIONS', nameEn: 'Stock In & Issues', nameUr: 'اسٹاک آمد و اخراج', descriptionEn: 'Record inward receipts and department issue requisitions.', isBaseFeature: true, dependsOn: ['STOCK_ITEMS'] },
    ],
  },
  FIXED_ASSETS: {
    code: 'FIXED_ASSETS',
    nameEn: 'Fixed Assets Management',
    nameUr: 'مستقل اثاثہ جات',
    descriptionEn: 'Asset tagging, room allocation, maintenance schedules, and depreciation tracking.',
    category: 'RESOURCES',
    isBaseModule: false,
    defaultTiers: ['ENTERPRISE'],
    basePath: '/admin/fixed-assets',
    iconName: 'Building',
    dependsOn: ['INVENTORY'],
    features: [
      { key: 'ASSET_REGISTER', nameEn: 'Asset Registry & Tagging', nameUr: 'اثاثہ جات رجسٹری', descriptionEn: 'Furniture, laboratory hardware, computer lab assets with barcodes.', isBaseFeature: true },
      { key: 'DEPRECIATION', nameEn: 'Depreciation Calculations', nameUr: 'فرسودگی کا حساب', descriptionEn: 'Straight-line and reducing balance asset depreciation.', isBaseFeature: false, dependsOn: ['ASSET_REGISTER'] },
    ],
  },
  PROCUREMENT: {
    code: 'PROCUREMENT',
    nameEn: 'Procurement & Vendors',
    nameUr: 'خریداری اور وینڈرز',
    descriptionEn: 'Vendor quotations, purchase orders, approval workflows, and Goods Receipt Notes (GRN).',
    category: 'RESOURCES',
    isBaseModule: false,
    defaultTiers: ['ENTERPRISE'],
    basePath: '/admin/procurement',
    iconName: 'Receipt',
    dependsOn: ['INVENTORY'],
    features: [
      { key: 'PURCHASE_ORDERS', nameEn: 'Purchase Orders & Quotes', nameUr: 'پرچیز آرڈرز', descriptionEn: 'Create formal purchase orders to approved suppliers.', isBaseFeature: true },
      { key: 'GRN_INWARD', nameEn: 'Goods Receipt Notes (GRN)', nameUr: 'سامان وصولی نوٹ', descriptionEn: 'Verify physical shipments and auto-update warehouse stock.', isBaseFeature: true, dependsOn: ['PURCHASE_ORDERS'] },
    ],
  },
  SCHOOL_STORE: {
    code: 'SCHOOL_STORE',
    nameEn: 'School Store & POS Sales',
    nameUr: 'اسکول اسٹور اور فروخت',
    descriptionEn: 'Uniform, books, stationery counter sales with direct receipt printing.',
    category: 'RESOURCES',
    isBaseModule: false,
    defaultTiers: ['STANDARD', 'FULL', 'ENTERPRISE'],
    basePath: '/admin/school-store',
    iconName: 'ShoppingCart',
    dependsOn: ['INVENTORY'],
    features: [
      { key: 'POS_COUNTER', nameEn: 'POS Counter Billing', nameUr: 'پوائنٹ آف سیلز', descriptionEn: 'Fast counter sales for uniforms, badges, notebooks with receipt prints.', isBaseFeature: true },
    ],
  },
  BIOMETRIC_INTEGRATION: {
    code: 'BIOMETRIC_INTEGRATION',
    nameEn: 'Biometric & IoT Device Sync',
    nameUr: 'بایومیٹرک و آئی او ٹی آلات',
    descriptionEn: 'Direct API and background push sync for ZKTeco, Hikvision, and RFID gates.',
    category: 'SYSTEM',
    isBaseModule: false,
    defaultTiers: ['FULL', 'ENTERPRISE'],
    basePath: '/admin/biometrics',
    iconName: 'Fingerprint',
    dependsOn: ['ATTENDANCE'],
    features: [
      { key: 'DEVICE_MANAGER', nameEn: 'Device Manager & Health', nameUr: 'آلات کنٹرول', descriptionEn: 'Configure device IP addresses and live communication health.', isBaseFeature: true },
      { key: 'REALTIME_PUSH', nameEn: 'Real-time Punch Sync', nameUr: 'ریئل ٹائم پنچ سنک', descriptionEn: 'Instantly mark attendance logs upon physical finger/face recognition.', isBaseFeature: true },
    ],
  },
  CUSTOM_REPORT_DESIGNER: {
    code: 'CUSTOM_REPORT_DESIGNER',
    nameEn: 'Custom Report Designer',
    nameUr: 'کسٹم رپورٹ ڈیزائنر',
    descriptionEn: 'Drag-and-drop query builder and report layout generator.',
    category: 'SYSTEM',
    isBaseModule: false,
    defaultTiers: ['ENTERPRISE'],
    basePath: '/admin/report-designer',
    iconName: 'Layout',
    dependsOn: ['REPORTS'],
    features: [
      { key: 'REPORT_BUILDER', nameEn: 'Visual Query Builder', nameUr: 'ویژول رپورٹ ڈیزائنر', descriptionEn: 'Create custom tabular reports combining students, fees, and exams.', isBaseFeature: true },
    ],
  },
};

/**
 * Returns all module definitions as an array.
 */
export function getAllModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY);
}

/**
 * Validates whether a module is enabled for a given tenant.
 */
export function isModuleEnabledForTenant(
  moduleCode: ModuleCode,
  tier: ProductTier = 'BASE',
  tenantOverrides?: Record<string, boolean>
): boolean {
  const definition = MODULE_REGISTRY[moduleCode];
  if (!definition) return false;

  // Base modules are always active in Base ERP
  if (definition.isBaseModule) {
    return true;
  }

  // Tenant-specific override takes precedence
  if (tenantOverrides && tenantOverrides[moduleCode] !== undefined) {
    return tenantOverrides[moduleCode];
  }

  // Default to tier configuration
  return definition.defaultTiers.includes(tier);
}

/**
 * Validates whether a specific feature is enabled for a module.
 */
export function isFeatureEnabledForTenant(
  moduleCode: ModuleCode,
  featureKey: string,
  tier: ProductTier = 'BASE',
  moduleEnabled: boolean = true,
  featureOverrides?: Record<string, boolean>
): boolean {
  if (!moduleEnabled) return false;

  const definition = MODULE_REGISTRY[moduleCode];
  if (!definition || !definition.features) return true;

  const feat = definition.features.find((f) => f.key === featureKey);
  if (!feat) return false;

  if (featureOverrides && featureOverrides[featureKey] !== undefined) {
    return featureOverrides[featureKey];
  }

  return feat.isBaseFeature;
}

export function getBaseModules(): ModuleDefinition[] {
  return getAllModules().filter((m) => m.isBaseModule);
}

export function getOptionalModules(): ModuleDefinition[] {
  return getAllModules().filter((m) => !m.isBaseModule);
}

export function getModulesForTier(tier: ProductTier): ModuleDefinition[] {
  return getAllModules().filter((m) => m.isBaseModule || m.defaultTiers.includes(tier));
}

export function resolveActiveModulesForTenant(
  tier: ProductTier = 'BASE',
  tenantOverrides?: Record<string, boolean>
): ModuleCode[] {
  return getAllModules()
    .filter((m) => isModuleEnabledForTenant(m.code, tier, tenantOverrides))
    .map((m) => m.code);
}
