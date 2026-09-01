export type EmployeeAttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ON_LEAVE'
  | 'EARLY_DEPARTURE'
  | 'HOLIDAY'
  | 'OFF_DAY';

export type EmployeePunchSource = 'MANUAL' | 'BIOMETRIC' | 'RFID' | 'MOBILE_APP';

export interface EmployeeAttendanceStatusConfig {
  code: EmployeeAttendanceStatus;
  labelEn: string;
  labelUr: string;
  badgeClass: string;
  dotColor: string;
}

export const EMPLOYEE_ATTENDANCE_STATUSES: Record<EmployeeAttendanceStatus, EmployeeAttendanceStatusConfig> = {
  PRESENT: {
    code: 'PRESENT',
    labelEn: 'Present',
    labelUr: 'حاضر',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  LATE: {
    code: 'LATE',
    labelEn: 'Late Arrival',
    labelUr: 'دیر سے آمد',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  HALF_DAY: {
    code: 'HALF_DAY',
    labelEn: 'Half Day',
    labelUr: 'نصف دن',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    dotColor: 'bg-orange-500',
  },
  EARLY_DEPARTURE: {
    code: 'EARLY_DEPARTURE',
    labelEn: 'Early Exit',
    labelUr: 'قبل از وقت روانگی',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotColor: 'bg-indigo-500',
  },
  ON_LEAVE: {
    code: 'ON_LEAVE',
    labelEn: 'Approved Leave',
    labelUr: 'منظور شدہ رخصت',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    dotColor: 'bg-sky-500',
  },
  ABSENT: {
    code: 'ABSENT',
    labelEn: 'Absent',
    labelUr: 'غیر حاضر',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotColor: 'bg-rose-500',
  },
  HOLIDAY: {
    code: 'HOLIDAY',
    labelEn: 'Holiday',
    labelUr: 'تعطیل',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
  },
  OFF_DAY: {
    code: 'OFF_DAY',
    labelEn: 'Weekly Off',
    labelUr: 'ہفتہ وار چھٹی',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-400',
  },
};

export interface EmployeeDTO {
  id: string;
  employeeNo: string;
  firstNameEn: string;
  lastNameEn?: string | null;
  fullNameUr?: string | null;
  gender: string;
  dob?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  email?: string | null;
  departmentId?: string | null;
  departmentName?: string;
  designationId?: string | null;
  designationName?: string;
  employeeCategoryId?: string | null;
  employeeCategoryName?: string;
  employmentTypeId?: string | null;
  employmentTypeName?: string;
  department?: { id: string; name: string; code: string } | null;
  designation?: { id: string; name: string; code: string } | null;
  employmentType?: { id: string; name: string; code: string } | null;
  confirmationStatus?: string | null;
  shiftId?: string | null;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  joiningDate: string;
  currentStatus: string;
  standardWorkingHours: number;
}

export interface EmployeeAttendanceRecordDTO {
  id: string;
  employeeId: string;
  attendanceDate: string;
  shiftId: string;
  shiftName?: string;
  shiftCode?: string;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: EmployeeAttendanceStatus;
  lateMinutes: number;
  earlyExitMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  isHoliday: boolean;
  isWeeklyOff: boolean;
  leaveTypeId?: string | null;
  leaveTypeName?: string;
  remarks?: string | null;
  punchSource: EmployeePunchSource;
  recordedByUserId?: string | null;
  recordedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftSegmentAttendanceDTO {
  shiftId: string;
  shiftName: string;
  shiftCode: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  scheduledDurationHours: number;
  graceMinutes: number;
  earlyExitGraceMinutes: number;
  breakMinutes: number;
  minHoursFullDay: number;
  minHoursHalfDay: number;
  isWorkingDay: boolean;
  precedenceSource: string;
  attendanceRecordId?: string | null;
  isMarked: boolean;
  checkInTime?: string | null; // e.g. "08:15"
  checkOutTime?: string | null; // e.g. "12:00"
  status: EmployeeAttendanceStatus;
  lateMinutes: number;
  earlyExitMinutes: number;
  workedMinutes: number;
  workedHours: number;
  overtimeMinutes: number;
  leaveTypeId?: string | null;
  leaveTypeName?: string | null;
  leaveApplicationId?: string | null;
  leaveApplicationNumber?: string | null;
  leaveScope?: string | null;
  halfDayPeriod?: string | null;
  leaveStartTime?: string | null;
  leaveEndTime?: string | null;
  remarks?: string | null;
}

export interface DailyEmployeeRosterItem {
  employee: EmployeeDTO;
  scheduledShiftsCount: number;
  totalScheduledHours: number;
  totalWorkedHours: number;
  totalLateMinutes: number;
  totalEarlyExitMinutes: number;
  dailyStatus: EmployeeAttendanceStatus;
  isFullyMarked: boolean;
  shiftSegments: ShiftSegmentAttendanceDTO[];
}

export interface EmployeeAttendanceDashboardMetrics {
  date: string;
  totalActiveEmployees: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  halfDayCount: number;
  earlyExitCount: number;
  unmarkedCount: number;
  totalScheduledShiftsCount: number;
  totalCompletedShiftsCount: number;
  totalWorkedHours: number;
  attendancePercentage: number;
  isTodayHoliday: boolean;
  isTodayWeeklyOff: boolean;
  holidayTitle?: string;
  departmentBreakdown: Array<{
    departmentId: string;
    departmentName: string;
    totalEmployees: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    leaveCount: number;
    attendancePercentage: number;
  }>;
}

export interface EmployeeAttendanceCorrectionAuditDTO {
  id: string;
  attendanceRecordId: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  departmentName?: string;
  shiftId?: string | null;
  shiftName?: string;
  shiftCode?: string;
  attendanceDate: string;
  previousStatus: string;
  newStatus: string;
  previousCheckIn?: string | null;
  newCheckIn?: string | null;
  previousCheckOut?: string | null;
  newCheckOut?: string | null;
  previousRemarks?: string | null;
  newRemarks?: string | null;
  correctionReason: string;
  correctedByUserId?: string | null;
  correctedByName?: string;
  createdAt: string;
}

export interface PayrollAttendanceSummaryDTO {
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  departmentName?: string;
  designationName?: string;
  periodStart: string;
  periodEnd: string;
  totalCalendarDays: number;
  totalNonWorkingDays: number;
  totalWorkingDays: number;
  totalScheduledShifts: number;
  presentShiftsCount: number;
  absentShiftsCount: number;
  leaveShiftsCount: number;
  halfDayShiftsCount: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lateArrivalCount: number;
  totalLateMinutes: number;
  totalEarlyExitMinutes: number;
  totalWorkedMinutes: number;
  totalWorkedHours: number;
  totalOvertimeMinutes: number;
  attendancePercentage: number;
}
