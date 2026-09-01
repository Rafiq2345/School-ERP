/**
 * Core Domain Types & DTOs for Leave Management (Phase 1 Foundation)
 */

export type LeaveAllocationMethod =
  | 'ANNUAL_UPFRONT'
  | 'MONTHLY_ACCRUAL'
  | 'JOINING_DATE_BASED'
  | 'CONFIRMATION_BASED'
  | 'PRORATED';

export type ProbationTreatment =
  | 'ALLOWED'
  | 'NOT_ALLOWED'
  | 'LIMITED_ENTITLEMENT'
  | 'UNPAID_ONLY';

export type EntitlementRelease =
  | 'ON_JOINING'
  | 'MONTHLY_DURING_PROBATION'
  | 'ON_CONFIRMATION'
  | 'PRORATED_AFTER_CONFIRMATION';

export type YearEndAction = 'EXPIRE' | 'CARRY_FORWARD' | 'ENCASH' | 'MIXED';

export type LeavePolicyAssignmentType =
  | 'EMPLOYEE'
  | 'DEPARTMENT'
  | 'DESIGNATION'
  | 'EMPLOYMENT_TYPE'
  | 'INSTITUTIONAL_DEFAULT';

export type EmployeeConfirmationStatus =
  | 'PROBATION'
  | 'EXTENDED_PROBATION'
  | 'CONFIRMED';

export type LeaveLedgerTransactionType =
  | 'OPENING_BALANCE'
  | 'ANNUAL_ALLOCATION'
  | 'MONTHLY_ACCRUAL'
  | 'MANUAL_ADJUSTMENT_ADD'
  | 'MANUAL_ADJUSTMENT_SUBTRACT'
  | 'CARRY_FORWARD'
  | 'LEAVE_USAGE'
  | 'LEAVE_CANCELLATION'
  | 'ENCASHMENT'
  | 'EXPIRY'
  | 'PAYROLL_ADJUSTMENT';

// ---------------------------------------------------------
// 1. LEAVE TYPE DTOs
// ---------------------------------------------------------

export interface LeaveTypeDto {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string | null;
  isPaid: boolean;
  isUnlimited: boolean;
  annualLimit: number | null;
  defaultAllocationMethod: LeaveAllocationMethod;
  minLeaveUnit: number;
  allowFullDay: boolean;
  allowHalfDay: boolean;
  allowShiftWise: boolean;
  allowHourly: boolean;
  attachmentRequired: boolean;
  attachmentThresholdDays: number;
  carryForwardAllowed: boolean;
  carryForwardLimit: number | null;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveTypeDto {
  name: string;
  code: string;
  description?: string | null;
  isPaid?: boolean;
  isUnlimited?: boolean;
  annualLimit?: number | null;
  defaultAllocationMethod?: LeaveAllocationMethod;
  minLeaveUnit?: number;
  allowFullDay?: boolean;
  allowHalfDay?: boolean;
  allowShiftWise?: boolean;
  allowHourly?: boolean;
  attachmentRequired?: boolean;
  attachmentThresholdDays?: number;
  carryForwardAllowed?: boolean;
  carryForwardLimit?: number | null;
  requiresApproval?: boolean;
  isActive?: boolean;
}

export interface UpdateLeaveTypeDto extends Partial<CreateLeaveTypeDto> {}

// ---------------------------------------------------------
// 2. LEAVE POLICY & RULES DTOs
// ---------------------------------------------------------

export interface LeavePolicyRuleDto {
  id?: string;
  leavePolicyId?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  annualEntitlement: number;
  isPaid: boolean;
  isUnlimited: boolean;
  allocationMethod: LeaveAllocationMethod;
  minLeaveUnit: number;
  allowHalfDay: boolean;
  allowShiftWise: boolean;
  allowHourly: boolean;
  allowNegativeBalance: boolean;
  maxNegativeBalance: number;
  maxConsecutiveDays: number | null;
  probationTreatment: ProbationTreatment;
  probationEntitlement: number | null;
  entitlementRelease: EntitlementRelease;
  yearEndAction: YearEndAction;
  maxCarryForwardDays: number | null;
  carryForwardExpiryMonths: number | null;
  maxEncashableDays: number | null;
  minBalanceForEncashment: number | null;
}

export interface LeavePolicyDto {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string | null;
  isDefault: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  effectiveFrom: string;
  effectiveTo: string | null;
  rules: LeavePolicyRuleDto[];
  activeAssignmentsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeavePolicyDto {
  name: string;
  code: string;
  description?: string | null;
  isDefault?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  effectiveFrom: string;
  effectiveTo?: string | null;
  rules: LeavePolicyRuleDto[];
}

export interface UpdateLeavePolicyDto extends Partial<CreateLeavePolicyDto> {}

// ---------------------------------------------------------
// 3. LEAVE POLICY ASSIGNMENT DTOs
// ---------------------------------------------------------

export interface LeavePolicyAssignmentDto {
  id: string;
  tenantId: string;
  leavePolicyId: string;
  leavePolicyName?: string;
  leavePolicyCode?: string;
  assignmentType: LeavePolicyAssignmentType;
  employeeId: string | null;
  employeeName?: string;
  employeeNo?: string;
  departmentId: string | null;
  departmentName?: string;
  designationId: string | null;
  designationName?: string;
  employmentTypeId: string | null;
  employmentTypeName?: string;
  isOverride: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  reason: string | null;
  isActive: boolean;
  assignedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BulkAssignLeavePolicyDto {
  leavePolicyId: string;
  assignmentType: LeavePolicyAssignmentType;
  departmentId?: string;
  designationId?: string;
  employmentTypeId?: string;
  employeeIds?: string[];
  isOverride?: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  reason?: string;
}

export interface LeaveAssignmentPreviewItem {
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  departmentName: string;
  designationName: string;
  employmentTypeName: string;
  currentPolicyId: string | null;
  currentPolicyName: string | null;
  currentPolicySource: 'OVERRIDE' | 'DIRECT' | 'DEPARTMENT' | 'DESIGNATION' | 'EMPLOYMENT_TYPE' | 'DEFAULT' | 'NONE';
  proposedPolicyId: string;
  proposedPolicyName: string;
  isOverride: boolean;
}

export interface LeaveAssignmentPreviewResult {
  totalTargetEmployees: number;
  employees: LeaveAssignmentPreviewItem[];
}

// ---------------------------------------------------------
// 4. LEAVE ENTITLEMENT & LEDGER DTOs
// ---------------------------------------------------------

export interface EmployeeLeaveEntitlementDto {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  employeeNo?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  leavePolicyId: string;
  leavePolicyName?: string;
  leaveYear: number;
  allocationMethod: LeaveAllocationMethod;
  openingBalance: number;
  allocatedDays: number;
  carriedForwardDays: number;
  adjustedDays: number;
  usedDays: number;
  encashedDays: number;
  expiredDays: number;
  availableBalance: number;
  hasOverride: boolean;
  status: string;
  lastCalculatedAt: string;
}

export interface BulkAllocateEntitlementDto {
  leaveYear: number;
  leavePolicyId?: string;
  departmentId?: string;
  designationId?: string;
  employmentTypeId?: string;
  employeeIds?: string[];
  overwriteExisting?: boolean;
}

export interface EntitlementAllocationPreviewItem {
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  departmentName: string;
  designationName: string;
  confirmationStatus: EmployeeConfirmationStatus;
  policyId: string;
  policyName: string;
  status: 'READY' | 'ALREADY_ALLOCATED' | 'NEEDS_RECALCULATION' | 'HAS_OVERRIDE' | 'PROBATION_LIMITED';
  leaveTypeEntitlements: {
    leaveTypeId: string;
    leaveTypeName: string;
    leaveTypeCode: string;
    entitlement: number;
    allocationMethod: LeaveAllocationMethod;
    isUnlimited: boolean;
  }[];
}

export interface EntitlementAllocationPreviewResult {
  leaveYear: number;
  totalEmployees: number;
  readyCount: number;
  alreadyAllocatedCount: number;
  needsRecalculationCount: number;
  hasOverrideCount: number;
  items: EntitlementAllocationPreviewItem[];
}

export interface ManualLeaveAdjustmentDto {
  employeeId: string;
  leaveTypeId: string;
  leaveYear: number;
  adjustmentType: 'ADD' | 'SUBTRACT';
  quantity: number;
  reason: string; // Mandatory justification
  effectiveDate: string;
}

export interface LeaveLedgerTransactionDto {
  id: string;
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  leavePolicyId: string | null;
  entitlementId: string | null;
  leaveYear: number;
  transactionType: LeaveLedgerTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  effectiveDate: string;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  shiftId: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface EmployeeLeaveSummaryDto {
  employee: {
    id: string;
    employeeNo: string;
    firstNameEn: string;
    lastNameEn: string | null;
    departmentName: string;
    designationName: string;
    employmentTypeName: string;
    confirmationStatus: EmployeeConfirmationStatus;
    joiningDate: string;
    probationEndDate: string | null;
    confirmationDate: string | null;
  };
  currentPolicy: {
    id: string;
    name: string;
    code: string;
    source: 'OVERRIDE' | 'DIRECT' | 'DEPARTMENT' | 'DESIGNATION' | 'EMPLOYMENT_TYPE' | 'DEFAULT' | 'NONE';
  } | null;
  leaveYear: number;
  balances: {
    leaveTypeId: string;
    leaveTypeName: string;
    leaveTypeCode: string;
    isPaid: boolean;
    isUnlimited: boolean;
    openingBalance: number;
    allocatedDays: number;
    carriedForwardDays: number;
    adjustedDays: number;
    usedDays: number;
    pendingDays: number; // Placeholder for Phase 2
    availableBalance: number;
  }[];
  recentTransactions: LeaveLedgerTransactionDto[];
}

// ---------------------------------------------------------
// ---------------------------------------------------------
// 5. AUDIT LOG DTOs
// ---------------------------------------------------------

export interface LeaveAuditDiffItem {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
  displayDiff: string;
}

export interface LeaveAuditActorDto {
  id: string | null;
  name: string;
  role: string | null;
  isSystem: boolean;
}

export interface LeaveAuditRelatedRecordDto {
  type: string;
  title: string;
  subtitle?: string;
  employeeNo?: string;
  department?: string;
  leaveTypeCode?: string;
}

export interface EnrichedLeaveAuditLogDto {
  id: string;
  tenantId: string;
  entityType: 'LEAVE_TYPE' | 'LEAVE_POLICY' | 'POLICY_ASSIGNMENT' | 'LEAVE_ENTITLEMENT' | 'LEAVE_LEDGER';
  entityId: string;
  action: string;
  reason: string | null;
  createdAt: string;
  performedBy: LeaveAuditActorDto;
  relatedRecord: LeaveAuditRelatedRecordDto;
  changeSummary: string;
  diffItems: LeaveAuditDiffItem[];
  previousState: any;
  newState: any;
}

export interface LeaveAuditQueryOptions {
  entityType?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  limit?: number;
}

export interface LeaveAuditLogDto {
  id: string;
  tenantId: string;
  entityType: 'LEAVE_TYPE' | 'LEAVE_POLICY' | 'POLICY_ASSIGNMENT' | 'LEAVE_ENTITLEMENT' | 'LEAVE_LEDGER';
  entityId: string;
  action: string;
  previousState: any;
  newState: any;
  reason: string | null;
  userId: string | null;
  userName?: string;
  createdAt: string;
}
