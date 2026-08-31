export type HolidayType =
  | 'PUBLIC_HOLIDAY'
  | 'NATIONAL_HOLIDAY'
  | 'RELIGIOUS_HOLIDAY'
  | 'VACATION'
  | 'EMERGENCY_CLOSURE'
  | 'WEEKLY_OFF'
  | 'CUSTOM_NON_WORKING';

export type HolidayScope = 'WHOLE_SCHOOL' | 'ACADEMIC_SESSION' | 'CLASS_SPECIFIC';

export type HolidayStatus = 'ACTIVE' | 'CANCELLED';

export interface HolidayTypeConfig {
  code: HolidayType;
  labelEn: string;
  labelUr: string;
  badgeClass: string;
  bgClass: string;
  textClass: string;
}

export const HOLIDAY_TYPES: Record<HolidayType, HolidayTypeConfig> = {
  PUBLIC_HOLIDAY: {
    code: 'PUBLIC_HOLIDAY',
    labelEn: 'Public Holiday',
    labelUr: 'سرکاری تعطیل',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
  },
  NATIONAL_HOLIDAY: {
    code: 'NATIONAL_HOLIDAY',
    labelEn: 'National Holiday',
    labelUr: 'قومی تعطیل',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
    bgClass: 'bg-green-500',
    textClass: 'text-green-700',
  },
  RELIGIOUS_HOLIDAY: {
    code: 'RELIGIOUS_HOLIDAY',
    labelEn: 'Religious Holiday',
    labelUr: 'مذہبی تعطیل',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    bgClass: 'bg-teal-500',
    textClass: 'text-teal-700',
  },
  VACATION: {
    code: 'VACATION',
    labelEn: 'Vacation / Recess',
    labelUr: 'تعطیلات / چھٹیاں',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    bgClass: 'bg-indigo-500',
    textClass: 'text-indigo-700',
  },
  EMERGENCY_CLOSURE: {
    code: 'EMERGENCY_CLOSURE',
    labelEn: 'Emergency Closure',
    labelUr: 'ہنگامی بندش',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    bgClass: 'bg-rose-500',
    textClass: 'text-rose-700',
  },
  WEEKLY_OFF: {
    code: 'WEEKLY_OFF',
    labelEn: 'Weekly Off',
    labelUr: 'ہفتہ وار چھٹی',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    bgClass: 'bg-slate-400',
    textClass: 'text-slate-700',
  },
  CUSTOM_NON_WORKING: {
    code: 'CUSTOM_NON_WORKING',
    labelEn: 'Special Non-Working Day',
    labelUr: 'خصوصی غیر تدریسی دن',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-700',
  },
};

export interface SchoolHolidayDTO {
  id: string;
  tenantId: string;
  title: string;
  holidayType: HolidayType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  durationDays: number;
  scope: HolidayScope;
  academicSessionId?: string | null;
  academicSessionName?: string | null;
  targetClassIds: string[];
  targetClassNames?: string[];
  status: HolidayStatus;
  description?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHolidayDTO {
  title: string;
  holidayType: HolidayType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  scope: HolidayScope;
  academicSessionId?: string;
  targetClassIds?: string[];
  description?: string;
  allowConflictOverride?: boolean;
}

export interface UpdateHolidayDTO {
  title?: string;
  holidayType?: HolidayType;
  startDate?: string;
  endDate?: string;
  scope?: HolidayScope;
  academicSessionId?: string;
  targetClassIds?: string[];
  description?: string;
  editReason: string;
}

export interface CancelHolidayDTO {
  cancellationReason: string;
}

export interface WeeklyOffSettingDTO {
  id?: string;
  academicSessionId?: string | null;
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  isActive: boolean;
  description?: string | null;
  dayNames?: string[];
  updatedAt?: string;
}

export interface ExistingAttendanceConflictDetail {
  date: string;
  attendanceCount: number;
  classesAffected: { classId: string; className: string; sectionCount: number; studentCount: number }[];
}

export interface HolidayConflictCheckResult {
  hasConflict: boolean;
  totalRecordsFound: number;
  conflictsByDate: ExistingAttendanceConflictDetail[];
}

export interface DateWorkingStatus {
  date: string; // YYYY-MM-DD
  isWorkingDay: boolean;
  isWeeklyOff: boolean;
  isHoliday: boolean;
  holiday?: {
    id: string;
    title: string;
    holidayType: HolidayType;
    scope: HolidayScope;
  } | null;
  dayOfWeek: number; // 0-6
  dayName: string;
}

export interface WorkingDaysCalculationResult {
  startDate: string;
  endDate: string;
  totalCalendarDays: number;
  weeklyOffCount: number;
  holidayCount: number;
  totalNonWorkingDays: number;
  totalWorkingDays: number;
  dayBreakdown?: DateWorkingStatus[];
}
