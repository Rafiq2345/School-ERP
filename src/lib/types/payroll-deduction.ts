/**
 * Core Domain Types & DTOs for Leave Management Phase 3
 * — Configurable Attendance-to-Payroll Leave Deduction & Reconciliation Engine
 */

// ---------------------------------------------------------
// ENUMS & UNIONS
// ---------------------------------------------------------

export type DeductionPolicyScope =
  | 'UNPAID_LEAVE'
  | 'LATE_ARRIVALS'
  | 'EARLY_DEPARTURE'
  | 'SHORT_HOURS'
  | 'HALF_DAY'
  | 'CUSTOM';

export type DeductionCalculationBasis =
  | 'CALENDAR_DAYS'
  | 'WORKING_DAYS'
  | 'FIXED_DIVISOR'
  | 'PAYROLL_PERIOD_WORKING_DAYS';

export type DeductionInputStatus =
  | 'PENDING'
  | 'PROCESSED'
  | 'REVERSED'
  | 'CANCELLED'
  | 'SUPERSEDED';

export type DeductionAuditAction =
  | 'GENERATED'
  | 'REVERSED'
  | 'CANCELLED'
  | 'PROCESSED'
  | 'REACTIVATED'
  | 'SUPERSEDED'
  | 'SKIPPED';

export type DeductionSourceType =
  | 'LEAVE_APPLICATION'
  | 'ATTENDANCE_ABSENCE'
  | 'ATTENDANCE_LATE_ACCUMULATION'
  | 'ATTENDANCE_HALF_DAY'
  | 'ATTENDANCE_EARLY_DEPARTURE'
  | 'ATTENDANCE_SHORT_HOURS';

export type DeductionPolicyAssignmentType =
  | 'INDIVIDUAL_OVERRIDE'
  | 'EMPLOYEE'
  | 'DEPARTMENT'
  | 'DESIGNATION'
  | 'EMPLOYMENT_TYPE'
  | 'EMPLOYEE_CATEGORY'
  | 'INSTITUTIONAL_DEFAULT';

// ---------------------------------------------------------
// 1. PAYROLL DEDUCTION POLICY DTOs
// ---------------------------------------------------------

export interface PayrollDeductionPolicyDto {
  id: string;
  tenantId: string;
  policyCode: string;
  policyName: string;
  scope: DeductionPolicyScope;
  leaveTypeId: string | null;
  leaveTypeName?: string | null;
  calculationBasis: DeductionCalculationBasis;
  fixedDivisor: number | null;
  lateTriggerCount: number | null;
  lateGraceMinutes?: number | null;
  lateDeductionUnit?: number | null;
  absenceDeductionUnit?: number | null;
  halfDayDeductionUnit?: number | null;
  earlyExitGraceMinutes?: number | null;
  earlyExitDeductionUnit?: number | null;
  isDefault?: boolean;
  maxDeductionDaysPerPeriod: number | null;
  notes: string | null;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayrollDeductionPolicyDto {
  policyCode: string;
  policyName: string;
  scope: DeductionPolicyScope;
  leaveTypeId?: string | null;
  calculationBasis: DeductionCalculationBasis;
  fixedDivisor?: number | null;
  lateTriggerCount?: number | null;
  lateGraceMinutes?: number | null;
  lateDeductionUnit?: number | null;
  absenceDeductionUnit?: number | null;
  halfDayDeductionUnit?: number | null;
  earlyExitGraceMinutes?: number | null;
  earlyExitDeductionUnit?: number | null;
  isDefault?: boolean;
  maxDeductionDaysPerPeriod?: number | null;
  notes?: string | null;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export type UpdatePayrollDeductionPolicyDto = Partial<CreatePayrollDeductionPolicyDto>;

// ---------------------------------------------------------
// 2. POLICY ASSIGNMENT DTOs
// ---------------------------------------------------------

export interface PayrollDeductionPolicyAssignmentDto {
  id: string;
  tenantId: string;
  policyId: string;
  policyCode?: string;
  policyName?: string;
  assignmentType: DeductionPolicyAssignmentType;
  employeeId?: string | null;
  employeeName?: string | null;
  employeeNo?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  designationId?: string | null;
  designationName?: string | null;
  employmentTypeId?: string | null;
  employmentTypeName?: string | null;
  employeeCategoryId?: string | null;
  employeeCategoryName?: string | null;
  isOverride: boolean;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayrollDeductionPolicyAssignmentDto {
  policyId: string;
  assignmentType: DeductionPolicyAssignmentType;
  employeeId?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  employmentTypeId?: string | null;
  employeeCategoryId?: string | null;
  isOverride?: boolean;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
}

// ---------------------------------------------------------
// 3. PAYROLL DEDUCTION INPUT DTOs
// ---------------------------------------------------------

/**
 * Evidence object stored in calculationEvidence JSON field.
 * Captures every variable used in the computation for a full audit trail.
 */
export interface DeductionCalculationEvidence {
  sourceType?: DeductionSourceType;
  leaveApplicationNumber?: string;
  leaveTypeName?: string;
  leaveScope?: string;
  requestedDays?: number;
  attendanceDate?: string;
  shiftId?: string;
  shiftName?: string;
  shiftCode?: string;
  shiftFraction?: number;
  totalLateOccurrencesInPeriod?: number;
  cycleIndex?: number;
  lateArrivalDatesInCycle?: string[];
  lateGraceMinutesApplied?: number;
  payrollPeriodStart: string;
  payrollPeriodEnd: string;
  payrollPeriodLabel: string;
  calendarDaysInPeriod: number;
  calculationBasis: DeductionCalculationBasis;
  fixedDivisorApplied: number | null;
  policyCodeUsed: string;
  policyIdUsed: string;
  policyNameUsed: string;
  isPaid: boolean;
  deductionDays: number;
  deductionAmountNote: string;
  generatedAt: string;
  generatedByActor: string;
}

export interface PayrollDeductionInputDto {
  id: string;
  tenantId: string;
  policyId: string;
  policyCode?: string;
  policyName?: string;
  sourceType: DeductionSourceType;
  leaveApplicationId: string | null;
  applicationNumber?: string;
  attendanceRecordId?: string | null;
  attendanceDate?: string | null;
  shiftId?: string | null;
  shiftName?: string | null;
  deductionSourceKey?: string | null;
  employeeId: string;
  employeeName?: string;
  employeeNo?: string;
  leaveTypeId: string | null;
  leaveTypeName: string | null;
  payrollPeriodStart: string; // YYYY-MM-DD
  payrollPeriodEnd: string;   // YYYY-MM-DD
  payrollPeriodLabel: string; // e.g. "September 2026"
  deductionScope: DeductionPolicyScope;
  calculationBasis: DeductionCalculationBasis;
  deductionDays: number;
  fixedDivisorUsed: number | null;
  deductionAmount: number | null; // Always null in Phase 3
  currencyCode: string;
  status: DeductionInputStatus;
  reversalReason: string | null;
  reversedAt: string | null;
  reversedByUserId: string | null;
  systemActorNote: string | null;
  calculationEvidence: DeductionCalculationEvidence;
  createdByUserId: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  auditLogs?: PayrollDeductionAuditLogDto[];
}

export interface PayrollDeductionAuditLogDto {
  id: string;
  tenantId: string;
  deductionInputId: string;
  action: DeductionAuditAction;
  actorUserId: string | null;
  actorName: string | null;
  previousStatus: string;
  newStatus: string;
  reason: string | null;
  evidence: Record<string, any> | null;
  createdAt: string;
}

export interface PayrollDeductionGenerationResult {
  applicationId?: string;
  applicationNumber?: string;
  sourceKey?: string;
  employeeId: string;
  skipped: boolean;
  skipReason?: string;
  wasIdempotent?: boolean;
  deductionInput?: PayrollDeductionInputDto;
}

export interface PayrollDeductionInputQueryOptions {
  tenantId: string;
  employeeId?: string;
  sourceType?: DeductionSourceType;
  status?: DeductionInputStatus;
  payrollPeriodStart?: string;
  leaveApplicationId?: string;
  attendanceDate?: string;
  leaveTypeId?: string;
  policyId?: string;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------
// 4. RECONCILIATION PREVIEW & SUMMARY DTOs
// ---------------------------------------------------------

export interface AttendanceReconciliationPreviewItem {
  employeeId: string;
  employeeNo?: string;
  employeeName: string;
  departmentName?: string;
  designationName?: string;
  sourceType: DeductionSourceType;
  sourceKey: string;
  attendanceDate?: string;
  shiftName?: string;
  policyCode: string;
  policyName: string;
  calculatedDays: number;
  reason: string;
  actionRequired: 'CREATE' | 'KEEP' | 'REVERSE' | 'SUPERSEDE' | 'SKIP_PAID_LEAVE' | 'SKIP_UNPAID_LEAVE_EXISTS';
}

export interface PeriodReconciliationSummary {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  totalEmployeesEvaluated: number;
  totalGenerated: number;
  totalExistingKept: number;
  totalReversed: number;
  totalSuperseded: number;
  totalSkippedPaidLeave: number;
  totalSkippedUnpaidLeaveLink: number;
  items: AttendanceReconciliationPreviewItem[];
}
