export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'LEAVE'
  | 'HALF_DAY'
  | 'EXCUSED';

export interface AttendanceStatusConfig {
  code: AttendanceStatus;
  labelEn: string;
  labelUr: string;
  shortCode: string;
  badgeClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export const ATTENDANCE_STATUSES: Record<AttendanceStatus, AttendanceStatusConfig> = {
  PRESENT: {
    code: 'PRESENT',
    labelEn: 'Present',
    labelUr: 'حاضر',
    shortCode: 'P',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-700',
  },
  ABSENT: {
    code: 'ABSENT',
    labelEn: 'Absent',
    labelUr: 'غیر حاضر',
    shortCode: 'A',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    bgClass: 'bg-rose-500',
    borderClass: 'border-rose-300',
    textClass: 'text-rose-700',
  },
  LATE: {
    code: 'LATE',
    labelEn: 'Late Arrival',
    labelUr: 'دیر سے آمد',
    shortCode: 'L',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    bgClass: 'bg-amber-500',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-700',
  },
  LEAVE: {
    code: 'LEAVE',
    labelEn: 'On Leave',
    labelUr: 'رخصت',
    shortCode: 'LV',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    bgClass: 'bg-blue-500',
    borderClass: 'border-blue-300',
    textClass: 'text-blue-700',
  },
  HALF_DAY: {
    code: 'HALF_DAY',
    labelEn: 'Half Day',
    labelUr: 'نصف یوم',
    shortCode: 'HD',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    bgClass: 'bg-purple-500',
    borderClass: 'border-purple-300',
    textClass: 'text-purple-700',
  },
  EXCUSED: {
    code: 'EXCUSED',
    labelEn: 'Excused',
    labelUr: 'معذور',
    shortCode: 'EX',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    bgClass: 'bg-slate-400',
    borderClass: 'border-slate-300',
    textClass: 'text-slate-700',
  },
};

export interface StudentAttendanceItemDTO {
  studentId: string;
  enrollmentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface SaveDailyAttendanceDTO {
  sessionId: string;
  classId: string;
  sectionId: string;
  date: string | Date; // YYYY-MM-DD
  records: StudentAttendanceItemDTO[];
  correctionReason?: string;
  allowHolidayOverride?: boolean;
}

export interface ClassSectionAttendanceSummary {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  totalEnrolled: number;
  markedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  unmarkedCount: number;
  attendanceRate: number;
  isMarked: boolean;
  markedAt?: Date;
  markedBy?: string;
}

export interface AttendanceDashboardStats {
  date: string;
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  unmarkedCount: number;
  attendancePercentage: number;
  isTodayHoliday?: boolean;
  todayHolidayTitle?: string;
  classBreakdown: ClassSectionAttendanceSummary[];
}

export interface StudentRosterForAttendance {
  studentId: string;
  enrollmentId: string;
  admissionNo: string;
  rollNumber: string | null;
  nameEn: string;
  fullNameUr: string | null;
  gender: string;
  photoUrl: string | null;
  existingAttendance?: {
    id: string;
    status: AttendanceStatus;
    remarks: string | null;
    markedAt: Date;
    recordedBy?: string;
  } | null;
}
