/**
 * Core Domain Types & DTOs for Leave Management Phase 3 Step 1
 * — Configurable Attendance-to-Payroll Leave Deduction Foundation
 */

// ---------------------------------------------------------
// ENUMS
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
  | 'CANCELLED';

export type DeductionAuditAction =
  | 'GENERATED'
  | 'REVERSED'
  | 'CANCELLED'
  | 'PROCESSED'
  | 'REACTIVATED'
  | 'SKIPPED';

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
  maxDeductionDaysPerPeriod?: number | null;
  notes?: string | null;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export type UpdatePayrollDeductionPolicyDto = Partial<CreatePayrollDeductionPolicyDto>;

// ---------------------------------------------------------
// 2. PAYROLL DEDUCTION INPUT DTOs
// ---------------------------------------------------------

/**
 * Evidence object stored in calculationEvidence JSON field.
 * Captures every variable used in the computation for a full audit trail.
 */
export interface DeductionCalculationEvidence {
  leaveApplicationNumber: string;
  leaveTypeName: string;
  leaveScope: string;
  requestedDays: number;
  payrollPeriodStart: string;
  payrollPeriodEnd: string;
  payrollPeriodLabel: string;
  calendarDaysInPeriod: number;
  calculationBasis: DeductionCalculationBasis;
  fixedDivisorApplied: number | null;
  policyCodeUsed: string;
  policyIdUsed: string;
  isPaid: boolean;
  deductionDays: number;
  /** null = deductionAmount requires salary data from Payroll module */
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
  leaveApplicationId: string;
  applicationNumber?: string;
  employeeId: string;
  employeeName?: string;
  employeeNo?: string;
  leaveTypeId: string | null;
  leaveTypeName?: string | null;
  payrollPeriodStart: string;
  payrollPeriodEnd: string;
  payrollPeriodLabel: string;
  deductionScope: string;
  calculationBasis: DeductionCalculationBasis;
  deductionDays: number;
  fixedDivisorUsed: number | null;
  deductionAmount: number | null;
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

export interface ReversePayrollDeductionInputDto {
  reason: string;
}

export interface PayrollDeductionInputQueryOptions {
  tenantId: string;
  employeeId?: string;
  status?: DeductionInputStatus;
  payrollPeriodStart?: string;
  leaveApplicationId?: string;
  leaveTypeId?: string;
  policyId?: string;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------
// 3. PAYROLL DEDUCTION AUDIT LOG DTOs
// ---------------------------------------------------------

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
  evidence: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------
// 4. GENERATION RESULT
// ---------------------------------------------------------

export interface PayrollDeductionGenerationResult {
  applicationId: string;
  applicationNumber: string;
  employeeId: string;
  skipped: boolean;
  skipReason?: string;
  deductionInput?: PayrollDeductionInputDto;
  wasIdempotent?: boolean; // true if record already existed (re-run protection)
}
