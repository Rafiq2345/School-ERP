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

// ---------------------------------------------------------
// 7. LEAVE APPLICATIONS & CALCULATION ENGINE (PHASE 2)
// ---------------------------------------------------------

export type LeaveApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SENT_BACK'
  | 'CLARIFICATION_REQUIRED'
  | 'CANCELLED';

export type LeaveScope =
  | 'FULL_DAY'
  | 'HALF_DAY'
  | 'SPECIFIC_SHIFT'
  | 'MULTIPLE_SHIFTS'
  | 'HOURLY';

export type HalfDayPeriod = 'FIRST_HALF' | 'SECOND_HALF';

export interface ShiftSelectionItem {
  date: string; // YYYY-MM-DD
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  leaveFraction?: number;
}

export interface LeaveCalculationDateBreakdown {
  date: string; // YYYY-MM-DD
  dayOfWeek: number;
  dayName: string;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string | null;
  scheduledShiftsCount: number;
  scheduledShifts: Array<{
    shiftId: string;
    shiftCode: string;
    shiftName: string;
    startTime: string;
    endTime: string;
  }>;
  appliedScope: LeaveScope;
  leaveQuantity: number; // in days
  notes?: string;
}

export interface LeaveCalculationShiftBreakdown {
  date: string;
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  leaveFraction: number;
}

export interface LeaveValidationWarning {
  field?: string;
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

export interface LeaveCalculationPreviewInputDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  leaveScope: LeaveScope;
  halfDayPeriod?: HalfDayPeriod | null;
  selectedShifts?: ShiftSelectionItem[];
  startTime?: string | null; // HH:MM
  endTime?: string | null; // HH:MM
}

export interface LeaveCalculationPreviewResultDto {
  isValid: boolean;
  employee: {
    id: string;
    employeeNo: string;
    name: string;
    departmentName: string;
    designationName: string;
    employmentTypeName: string;
    confirmationStatus: EmployeeConfirmationStatus;
  };
  policy: {
    id: string;
    name: string;
    code: string;
    rule: {
      annualEntitlement: number | null;
      isPaid: boolean;
      isUnlimited: boolean;
      allowFullDay: boolean;
      allowHalfDay: boolean;
      allowShiftWise: boolean;
      allowHourly: boolean;
      allowNegativeBalance: boolean;
      maxNegativeBalance: number;
      probationTreatment: ProbationTreatment;
      probationEntitlement: number | null;
      entitlementRelease: EntitlementRelease;
      attachmentRequired: boolean;
      attachmentThresholdDays: number;
    };
  };
  leaveType: {
    id: string;
    name: string;
    code: string;
    isPaid: boolean;
    isUnlimited: boolean;
    allowFullDay: boolean;
    allowHalfDay: boolean;
    allowShiftWise: boolean;
    allowHourly: boolean;
  };
  calendarSummary: {
    totalCalendarDays: number;
    workingDaysCount: number;
    holidaysCount: number;
    weeklyOffCount: number;
    totalRequestedDays: number;
    totalDurationHours?: number | null;
  };
  dateBreakdown: LeaveCalculationDateBreakdown[];
  shiftBreakdown: LeaveCalculationShiftBreakdown[];
  balanceSnapshot: {
    allocatedDays: number;
    usedDays: number;
    adjustedDays: number;
    availableBalance: number;
    pendingRequestedDays: number;
    effectiveRemainingBalance: number;
    projectedBalanceAfterApproval: number;
    isUnlimited: boolean;
  };
  requiresAttachment: boolean;
  attachmentThresholdDays: number;
  warnings: LeaveValidationWarning[];
  errors: LeaveValidationWarning[];
}

export interface CreateLeaveApplicationInputDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  leaveScope: LeaveScope;
  halfDayPeriod?: HalfDayPeriod | null;
  selectedShifts?: ShiftSelectionItem[];
  startTime?: string | null;
  endTime?: string | null;
  reason: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  attachmentMime?: string | null;
  saveAsDraft?: boolean;
}

export interface UpdateLeaveApplicationInputDto {
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
  leaveScope?: LeaveScope;
  halfDayPeriod?: HalfDayPeriod | null;
  selectedShifts?: ShiftSelectionItem[];
  startTime?: string | null;
  endTime?: string | null;
  reason?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  attachmentMime?: string | null;
  submit?: boolean;
}

export interface LeaveApplicationDateDto {
  id: string;
  applicationId: string;
  date: string;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  leaveQuantity: number;
  notes: string | null;
}

export interface LeaveApplicationShiftDto {
  id: string;
  applicationId: string;
  date: string;
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  leaveFraction: number;
}

export interface LeaveApplicationDto {
  id: string;
  tenantId: string;
  applicationNumber: string;
  employeeId: string;
  leaveTypeId: string;
  leavePolicyId: string | null;
  status: LeaveApplicationStatus;
  leaveScope: LeaveScope;
  halfDayPeriod: HalfDayPeriod | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  durationHours: number | null;
  requestedDays: number;
  workingDaysCount: number;
  holidaysCount: number;
  isPaid: boolean;
  reason: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachmentMime: string | null;
  requiresAttachment: boolean;
  isAttachmentProvided: boolean;
  employeeStatusSnapshot: string | null;
  policySnapshotJson: any;
  balanceSnapshot: any;
  applicantUserId: string | null;
  applicantName?: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    employeeNo: string;
    firstNameEn: string;
    lastNameEn: string;
    departmentName: string;
    designationName: string;
    employmentTypeName: string;
    confirmationStatus: string;
  };
  leaveType: {
    id: string;
    name: string;
    code: string;
    isPaid: boolean;
    isUnlimited: boolean;
  };
  leavePolicy?: {
    id: string;
    name: string;
    code: string;
  } | null;
  dates: LeaveApplicationDateDto[];
  shifts: LeaveApplicationShiftDto[];
}

export interface LeaveApplicationQueryOptions {
  employeeId?: string;
  departmentId?: string;
  leaveTypeId?: string;
  status?: LeaveApplicationStatus | string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------
// 10. APPROVAL WORKFLOW TYPES & DTOs (PHASE 2 STEP 2)
// ---------------------------------------------------------

export type ApprovalWorkflowAssignmentType =
  | 'INDIVIDUAL_OVERRIDE'
  | 'EMPLOYEE'
  | 'DEPARTMENT'
  | 'DESIGNATION'
  | 'EMPLOYMENT_TYPE'
  | 'LEAVE_TYPE'
  | 'INSTITUTIONAL_DEFAULT';

export type ApprovalApproverType =
  | 'USER'
  | 'ROLE'
  | 'DEPARTMENT_HEAD'
  | 'DESIGNATION'
  | 'MANAGEMENT';

export type ApprovalStepStatus =
  | 'WAITING'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SENT_BACK'
  | 'CLARIFICATION_REQUESTED'
  | 'SKIPPED'
  | 'CANCELLED';

export type ApprovalInstanceStatus =
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'SENT_BACK'
  | 'CLARIFICATION_REQUIRED'
  | 'CANCELLED';

export type ApproverActionType =
  | 'APPROVE'
  | 'REJECT'
  | 'SEND_BACK'
  | 'REQUEST_CLARIFICATION'
  | 'SUBMIT_CLARIFICATION_RESPONSE'
  | 'SKIP';

export interface LeaveApprovalWorkflowStepDto {
  id: string;
  workflowId: string;
  stepNumber: number;
  stepName: string;
  approverType: ApprovalApproverType;
  approverUserId: string | null;
  approverUserName?: string | null;
  approverRole: string | null;
  approverDesignationId: string | null;
  approverDesignationName?: string | null;
  isRequired: boolean;
  autoApproveAfterDays: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveApprovalWorkflowStepDto {
  stepNumber: number;
  stepName: string;
  approverType: ApprovalApproverType;
  approverUserId?: string | null;
  approverRole?: string | null;
  approverDesignationId?: string | null;
  isRequired?: boolean;
  autoApproveAfterDays?: number | null;
  isActive?: boolean;
}

export interface LeaveApprovalWorkflowRuleDto {
  id: string;
  workflowId: string;
  assignmentType: ApprovalWorkflowAssignmentType;
  employeeId: string | null;
  employeeName?: string | null;
  employeeNo?: string | null;
  departmentId: string | null;
  departmentName?: string | null;
  designationId: string | null;
  designationName?: string | null;
  employmentTypeId: string | null;
  employmentTypeName?: string | null;
  leaveTypeId: string | null;
  leaveTypeName?: string | null;
  isOverride: boolean;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveApprovalWorkflowRuleDto {
  assignmentType: ApprovalWorkflowAssignmentType;
  employeeId?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  employmentTypeId?: string | null;
  leaveTypeId?: string | null;
  isOverride?: boolean;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
}

export interface LeaveApprovalWorkflowDto {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
  createdByUserId: string | null;
  rulesCount: number;
  stepsCount: number;
  rules: LeaveApprovalWorkflowRuleDto[];
  steps: LeaveApprovalWorkflowStepDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveApprovalWorkflowDto {
  name: string;
  code: string;
  description?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  steps: CreateLeaveApprovalWorkflowStepDto[];
  rules?: CreateLeaveApprovalWorkflowRuleDto[];
}

export interface UpdateLeaveApprovalWorkflowDto {
  name?: string;
  code?: string;
  description?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  steps?: CreateLeaveApprovalWorkflowStepDto[];
  rules?: CreateLeaveApprovalWorkflowRuleDto[];
}

export interface LeaveRequestApprovalStepDto {
  id: string;
  instanceId: string;
  stepNumber: number;
  stepName: string;
  approverType: ApprovalApproverType;
  approverUserId: string | null;
  approverRole: string | null;
  approverDesignationId: string | null;
  isRequired: boolean;
  status: ApprovalStepStatus;
  assignedAt: string | null;
  actionAt: string | null;
  actionByUserId: string | null;
  actionByUserName?: string | null;
  action: string | null;
  remarks: string | null;
  clarificationDetails?: {
    question?: string;
    askedBy?: string;
    askedByName?: string;
    askedAt?: string;
    response?: string;
    respondedBy?: string;
    respondedAt?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveApprovalActionHistoryDto {
  id: string;
  instanceId: string;
  stepId: string | null;
  stepNumber: number;
  stepName: string;
  action: string;
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string | null;
  previousStatus: string;
  newStatus: string;
  remarks: string | null;
  metadata?: any;
  createdAt: string;
}

export interface LeaveRequestApprovalInstanceDto {
  id: string;
  tenantId: string;
  applicationId: string;
  workflowId: string | null;
  workflowName: string;
  workflowCode: string;
  workflowSnapshot: any;
  currentStepNumber: number;
  totalSteps: number;
  status: ApprovalInstanceStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  steps: LeaveRequestApprovalStepDto[];
  actionHistory: LeaveApprovalActionHistoryDto[];
  currentPendingStep?: LeaveRequestApprovalStepDto | null;
}

export interface ApproverActionInputDto {
  action: ApproverActionType;
  remarks?: string;
  clarificationResponse?: string;
  targetStepNumber?: number;
}

// ---------------------------------------------------------
// 8. YEAR-END LEAVE PROCESSING DTOs (PHASE 3 STEP 3)
// ---------------------------------------------------------

export interface YearEndDispositionItemDto {
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  departmentName?: string;
  designationName?: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  policyId?: string;
  policyCode?: string;
  policyName?: string;
  yearEndAction: YearEndAction;
  availableBalance: number;
  carriedForwardDays: number;
  encashedDays: number;
  expiredDays: number;
  finalBalance: number;
  status: 'READY' | 'SKIPPED' | 'PROCESSED' | 'REVERSED';
  skipReason?: string;
}

export interface YearEndPreviewSummaryDto {
  sourceLeaveYear: number;
  targetLeaveYear: number;
  totalEmployees: number;
  totalEligibleRecords: number;
  totalCarriedForwardDays: number;
  totalEncashedDays: number;
  totalExpiredDays: number;
  items: YearEndDispositionItemDto[];
  alreadyProcessed?: boolean;
  existingBatchNumber?: string | null;
  existingBatchId?: string | null;
  existingBatchExecutedAt?: string | null;
}

export interface ExecuteYearEndBatchDto {
  sourceLeaveYear: number;
  targetLeaveYear: number;
  departmentId?: string;
  employeeIds?: string[];
  notes?: string;
}

export interface LeaveYearEndBatchItemDto {
  id: string;
  batchId: string;
  employeeId: string;
  employeeNo?: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leavePolicyId: string | null;
  initialBalance: number;
  carriedForwardDays: number;
  encashedDays: number;
  expiredDays: number;
  finalBalance: number;
  ruleSnapshot: Record<string, any>;
  status: 'PROCESSED' | 'SKIPPED' | 'REVERSED';
  skipReason: string | null;
  createdAt: string;
}

export interface LeaveYearEndBatchDto {
  id: string;
  tenantId: string;
  batchNumber: string;
  sourceLeaveYear: number;
  targetLeaveYear: number;
  status: 'COMPLETED' | 'REVERSED';
  totalEmployeesScanned: number;
  totalCarriedForwardDays: number;
  totalEncashedDays: number;
  totalExpiredDays: number;
  notes: string | null;
  executedByUserId: string | null;
  executedByName?: string | null;
  executedAt: string;
  reversedByUserId: string | null;
  reversedByName?: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  items?: LeaveYearEndBatchItemDto[];
  createdAt: string;
  updatedAt: string;
}
