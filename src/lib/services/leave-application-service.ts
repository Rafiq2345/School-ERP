import { LeaveApprovalService } from './leave-approval-service';
import { prisma } from '@/lib/db/prisma';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors/app-error';
import {
  LeaveApplicationDto,
  CreateLeaveApplicationInputDto,
  UpdateLeaveApplicationInputDto,
  LeaveApplicationQueryOptions,
} from '@/lib/types/leave';
import { LeaveCalculationService } from '@/lib/services/leave-calculation-service';
import { WorkScheduleService } from '@/lib/services/work-schedule-service';

export class LeaveApplicationService {
  /**
   * Generates a unique sequential application number e.g. LR-2026-000001
   */
  public static async generateApplicationNumber(tenantId: string, year: number, tx?: any): Promise<string> {
    const db = tx || prisma;
    const seq = await db.leaveSequence.upsert({
      where: {
        tenantId_year: {
          tenantId,
          year,
        },
      },
      update: {
        lastSequence: { increment: 1 },
      },
      create: {
        tenantId,
        year,
        lastSequence: 1,
      },
    });

    const padded = String(seq.lastSequence).padStart(6, '0');
    return `LR-${year}-${padded}`;
  }

  /**
   * Formats DB model to LeaveApplicationDto
   */
  public static formatApplicationDto(app: any): LeaveApplicationDto {
    return {
      id: app.id,
      tenantId: app.tenantId,
      applicationNumber: app.applicationNumber,
      employeeId: app.employeeId,
      leaveTypeId: app.leaveTypeId,
      leavePolicyId: app.leavePolicyId,
      status: app.status as any,
      leaveScope: app.leaveScope as any,
      halfDayPeriod: app.halfDayPeriod as any,
      startDate: app.startDate.toISOString().split('T')[0],
      endDate: app.endDate.toISOString().split('T')[0],
      startTime: app.startTime,
      endTime: app.endTime,
      durationHours: app.durationHours ? Number(app.durationHours) : null,
      requestedDays: Number(app.requestedDays),
      workingDaysCount: app.workingDaysCount,
      holidaysCount: app.holidaysCount,
      isPaid: app.isPaid,
      reason: app.reason,
      attachmentUrl: app.attachmentUrl,
      attachmentName: app.attachmentName,
      attachmentSize: app.attachmentSize,
      attachmentMime: app.attachmentMime,
      requiresAttachment: app.requiresAttachment,
      isAttachmentProvided: app.isAttachmentProvided,
      employeeStatusSnapshot: app.employeeStatusSnapshot,
      policySnapshotJson: app.policySnapshotJson,
      balanceSnapshot: app.balanceSnapshot,
      applicantUserId: app.applicantUserId,
      applicantName: app.applicant ? app.applicant.username || app.applicant.email : null,
      submittedAt: app.submittedAt ? app.submittedAt.toISOString() : null,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      employee: {
        id: app.employee.id,
        employeeNo: app.employee.employeeNo,
        firstNameEn: app.employee.firstNameEn,
        lastNameEn: app.employee.lastNameEn,
        departmentName: app.employee.department?.name || 'Unassigned',
        designationName: app.employee.designation?.name || 'Unassigned',
        employmentTypeName: app.employee.employmentType?.name || 'Unassigned',
        confirmationStatus: app.employee.confirmationStatus || 'CONFIRMED',
      },
      leaveType: {
        id: app.leaveType.id,
        name: app.leaveType.name,
        code: app.leaveType.code,
        isPaid: app.leaveType.isPaid,
        isUnlimited: app.leaveType.isUnlimited,
      },
      leavePolicy: app.leavePolicy
        ? {
            id: app.leavePolicy.id,
            name: app.leavePolicy.name,
            code: app.leavePolicy.code,
          }
        : null,
      dates: (app.dates || []).map((d: any) => ({
        id: d.id,
        applicationId: d.applicationId,
        date: d.date.toISOString().split('T')[0],
        isWorkingDay: d.isWorkingDay,
        isHoliday: d.isHoliday,
        holidayName: d.holidayName,
        leaveQuantity: Number(d.leaveQuantity),
        notes: d.notes,
      })),
      shifts: (app.shifts || []).map((s: any) => ({
        id: s.id,
        applicationId: s.applicationId,
        date: s.date.toISOString().split('T')[0],
        shiftId: s.shiftId,
        shiftCode: s.shiftCode,
        shiftName: s.shiftName,
        startTime: s.startTime,
        endTime: s.endTime,
        leaveFraction: Number(s.leaveFraction),
      })),
    };
  }

  /**
   * Creates a Leave Application (as Draft or Submitted)
   */
  public static async createApplication(
    tenantId: string,
    data: CreateLeaveApplicationInputDto,
    userId?: string
  ): Promise<LeaveApplicationDto> {
    if (!data.reason || data.reason.trim().length === 0) {
      throw new ValidationError('A meaningful leave reason is mandatory.');
    }

    const startDate = LeaveCalculationService.normalizeDate(data.startDate);
    const endDate = LeaveCalculationService.normalizeDate(data.endDate);
    const year = startDate.getUTCFullYear();

    // 1. Run Calculation & Validation Preview
    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      leaveScope: data.leaveScope,
      halfDayPeriod: data.halfDayPeriod,
      selectedShifts: data.selectedShifts,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    const isDraft = data.saveAsDraft === true;

    if (!isDraft) {
      // If submitting, enforce all strict validations
      if (preview.errors.length > 0) {
        const errorMsgs = preview.errors.map((e) => e.message).join(' | ');
        throw new ValidationError(`Cannot submit leave application: ${errorMsgs}`);
      }

      if (preview.requiresAttachment && !data.attachmentUrl) {
        throw new ValidationError(
          `Supporting document attachment is mandatory for this ${preview.leaveType.name} request (${preview.calendarSummary.totalRequestedDays} days exceeds threshold of ${preview.attachmentThresholdDays} days).`
        );
      }
    }

    // 2. Persist Application in Transaction
    return prisma.$transaction(async (tx) => {
      const applicationNumber = await this.generateApplicationNumber(tenantId, year, tx);
      const status = isDraft ? 'DRAFT' : 'PENDING_APPROVAL';

      let validApplicantUserId: string | null = null;
      if (userId) {
        const u = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (u) validApplicantUserId = u.id;
      }

      const app = await tx.leaveApplication.create({
        data: {
          tenantId,
          applicationNumber,
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
          leavePolicyId: preview.policy.id,
          status,
          leaveScope: data.leaveScope,
          halfDayPeriod: data.halfDayPeriod || null,
          startDate,
          endDate,
          startTime: data.startTime || null,
          endTime: data.endTime || null,
          durationHours: preview.calendarSummary.totalDurationHours || null,
          requestedDays: preview.calendarSummary.totalRequestedDays,
          workingDaysCount: preview.calendarSummary.workingDaysCount,
          holidaysCount: preview.calendarSummary.holidaysCount,
          isPaid: preview.leaveType.isPaid,
          reason: data.reason.trim(),
          attachmentUrl: data.attachmentUrl || null,
          attachmentName: data.attachmentName || null,
          attachmentSize: data.attachmentSize || null,
          attachmentMime: data.attachmentMime || null,
          requiresAttachment: preview.requiresAttachment,
          isAttachmentProvided: !!data.attachmentUrl,
          employeeStatusSnapshot: preview.employee.confirmationStatus,
          policySnapshotJson: preview.policy as any,
          balanceSnapshot: preview.balanceSnapshot as any,
          applicantUserId: validApplicantUserId,
          submittedAt: isDraft ? null : new Date(),
        },
      });

      // Create Date Breakdowns
      for (const d of preview.dateBreakdown) {
        await tx.leaveApplicationDate.create({
          data: {
            tenantId,
            applicationId: app.id,
            date: LeaveCalculationService.normalizeDate(d.date),
            isWorkingDay: d.isWorkingDay,
            isHoliday: d.isHoliday,
            holidayName: d.holidayName || null,
            leaveQuantity: d.leaveQuantity,
            notes: d.notes || null,
          },
        });
      }

      // Create Shift Breakdowns if applicable
      for (const s of preview.shiftBreakdown) {
        await tx.leaveApplicationShift.create({
          data: {
            tenantId,
            applicationId: app.id,
            date: LeaveCalculationService.normalizeDate(s.date),
            shiftId: s.shiftId,
            shiftCode: s.shiftCode,
            shiftName: s.shiftName,
            startTime: s.startTime,
            endTime: s.endTime,
            leaveFraction: s.leaveFraction,
          },
        });
      }

      // Create Governance Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_APPLICATION' as any,
          entityId: app.id,
          action: isDraft ? 'DRAFT_CREATED' : 'APPLICATION_SUBMITTED',
          previousState: undefined,
          newState: {
            applicationNumber: app.applicationNumber,
            employeeId: app.employeeId,
            employeeName: preview.employee.name,
            leaveTypeCode: preview.leaveType.code,
            leaveScope: app.leaveScope,
            requestedDays: preview.calendarSummary.totalRequestedDays,
            status,
            reason: app.reason,
          },
          reason: isDraft
            ? `Saved draft leave application ${app.applicationNumber}`
            : `Submitted leave application ${app.applicationNumber} (${preview.calendarSummary.totalRequestedDays}d ${preview.leaveType.name})`,
          userId: userId || null,
        },
      });

      // Reload and return complete DTO
      const created = await tx.leaveApplication.findUnique({
        where: { id: app.id },
        include: {
          employee: {
            include: { department: true, designation: true, employmentType: true },
          },
          leaveType: true,
          leavePolicy: true,
          applicant: true,
          dates: { orderBy: { date: 'asc' } },
          shifts: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
        },
      });

      return this.formatApplicationDto(created);
    });
  }

  /**
   * Updates an existing DRAFT application
   */
  public static async updateApplication(
    tenantId: string,
    id: string,
    data: UpdateLeaveApplicationInputDto,
    userId?: string
  ): Promise<LeaveApplicationDto> {
    const existing = await prisma.leaveApplication.findUnique({
      where: { id },
      include: {
        employee: {
          include: { department: true, designation: true, employmentType: true },
        },
        leaveType: true,
        leavePolicy: true,
        applicant: true,
        dates: true,
        shifts: true,
      },
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundError(`Leave Application with ID [${id}] not found.`);
    }

    if (existing.status !== 'DRAFT') {
      throw new ValidationError(`Only DRAFT applications can be edited. Current status is [${existing.status}].`);
    }

    const leaveTypeId = data.leaveTypeId || existing.leaveTypeId;
    const startDateStr = data.startDate || existing.startDate.toISOString().split('T')[0];
    const endDateStr = data.endDate || existing.endDate.toISOString().split('T')[0];
    const leaveScope = data.leaveScope || (existing.leaveScope as any);
    const halfDayPeriod = data.halfDayPeriod !== undefined ? data.halfDayPeriod : (existing.halfDayPeriod as any);
    const reason = data.reason !== undefined ? data.reason.trim() : existing.reason;
    const attachmentUrl = data.attachmentUrl !== undefined ? data.attachmentUrl : existing.attachmentUrl;
    const attachmentName = data.attachmentName !== undefined ? data.attachmentName : existing.attachmentName;
    const attachmentSize = data.attachmentSize !== undefined ? data.attachmentSize : existing.attachmentSize;
    const attachmentMime = data.attachmentMime !== undefined ? data.attachmentMime : existing.attachmentMime;

    // Run preview
    const preview = await LeaveCalculationService.calculateLeavePreview(
      tenantId,
      {
        employeeId: existing.employeeId,
        leaveTypeId,
        startDate: startDateStr,
        endDate: endDateStr,
        leaveScope,
        halfDayPeriod,
        selectedShifts: data.selectedShifts || (existing.shifts as any),
        startTime: data.startTime || existing.startTime,
        endTime: data.endTime || existing.endTime,
      },
      existing.id
    );

    const isSubmitting = data.submit === true;

    if (isSubmitting) {
      if (preview.errors.length > 0) {
        const errorMsgs = preview.errors.map((e) => e.message).join(' | ');
        throw new ValidationError(`Cannot submit leave application: ${errorMsgs}`);
      }

      if (preview.requiresAttachment && !attachmentUrl) {
        throw new ValidationError(
          `Supporting document attachment is mandatory for this request (${preview.calendarSummary.totalRequestedDays} days exceeds threshold of ${preview.attachmentThresholdDays} days).`
        );
      }
    }

    const startDate = LeaveCalculationService.normalizeDate(startDateStr);
    const endDate = LeaveCalculationService.normalizeDate(endDateStr);
    const status = isSubmitting ? 'PENDING_APPROVAL' : 'DRAFT';

    const appResult = await prisma.$transaction(async (tx) => {
      // Delete old date breakdowns and shifts
      await tx.leaveApplicationDate.deleteMany({ where: { applicationId: id } });
      await tx.leaveApplicationShift.deleteMany({ where: { applicationId: id } });

      const updated = await tx.leaveApplication.update({
        where: { id },
        data: {
          leaveTypeId,
          leavePolicyId: preview.policy.id,
          status,
          leaveScope,
          halfDayPeriod: halfDayPeriod || null,
          startDate,
          endDate,
          startTime: data.startTime || existing.startTime,
          endTime: data.endTime || existing.endTime,
          durationHours: preview.calendarSummary.totalDurationHours || null,
          requestedDays: preview.calendarSummary.totalRequestedDays,
          workingDaysCount: preview.calendarSummary.workingDaysCount,
          holidaysCount: preview.calendarSummary.holidaysCount,
          isPaid: preview.leaveType.isPaid,
          reason,
          attachmentUrl: attachmentUrl || null,
          attachmentName: attachmentName || null,
          attachmentSize: attachmentSize || null,
          attachmentMime: attachmentMime || null,
          requiresAttachment: preview.requiresAttachment,
          isAttachmentProvided: !!attachmentUrl,
          employeeStatusSnapshot: preview.employee.confirmationStatus,
          policySnapshotJson: preview.policy as any,
          balanceSnapshot: preview.balanceSnapshot as any,
          submittedAt: isSubmitting ? new Date() : existing.submittedAt,
        },
      });

      // Insert new Date Breakdowns
      for (const d of preview.dateBreakdown) {
        await tx.leaveApplicationDate.create({
          data: {
            tenantId,
            applicationId: id,
            date: LeaveCalculationService.normalizeDate(d.date),
            isWorkingDay: d.isWorkingDay,
            isHoliday: d.isHoliday,
            holidayName: d.holidayName || null,
            leaveQuantity: d.leaveQuantity,
            notes: d.notes || null,
          },
        });
      }

      // Insert new Shift Breakdowns
      for (const s of preview.shiftBreakdown) {
        await tx.leaveApplicationShift.create({
          data: {
            tenantId,
            applicationId: id,
            date: LeaveCalculationService.normalizeDate(s.date),
            shiftId: s.shiftId,
            shiftCode: s.shiftCode,
            shiftName: s.shiftName,
            startTime: s.startTime,
            endTime: s.endTime,
            leaveFraction: s.leaveFraction,
          },
        });
      }

      // Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_APPLICATION' as any,
          entityId: id,
          action: isSubmitting ? 'APPLICATION_SUBMITTED' : 'DRAFT_UPDATED',
          previousState: {
            status: existing.status,
            requestedDays: Number(existing.requestedDays),
            reason: existing.reason,
          },
          newState: {
            applicationNumber: updated.applicationNumber,
            status,
            requestedDays: preview.calendarSummary.totalRequestedDays,
            reason,
          },
          reason: isSubmitting
            ? `Submitted draft application ${updated.applicationNumber}`
            : `Updated draft application ${updated.applicationNumber}`,
          userId: userId || null,
        },
      });

      const finalApp = await tx.leaveApplication.findUnique({
        where: { id },
        include: {
          employee: {
            include: { department: true, designation: true, employmentType: true },
          },
          leaveType: true,
          leavePolicy: true,
          applicant: true,
          dates: { orderBy: { date: 'asc' } },
          shifts: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
        },
      });

      return this.formatApplicationDto(finalApp);
    });

    if (isSubmitting) {
      await LeaveApprovalService.initializeApprovalInstance(tenantId, appResult.id, userId).catch((err) => {
        console.warn('Auto approval workflow initialization warning on submit:', err.message);
      });
    }

    return appResult;
  }

  /**
   * Submits a DRAFT application
   */
  public static async submitApplication(tenantId: string, id: string, userId?: string): Promise<LeaveApplicationDto> {
    return this.updateApplication(tenantId, id, { submit: true }, userId);
  }

  /**
   * Cancels an application (Draft, Submitted, or Pending)
   */
  public static async cancelApplication(
    tenantId: string,
    id: string,
    cancelReason: string,
    userId?: string
  ): Promise<LeaveApplicationDto> {
    const existing = await prisma.leaveApplication.findUnique({
      where: { id },
      include: {
        employee: {
          include: { department: true, designation: true, employmentType: true },
        },
        leaveType: true,
        leavePolicy: true,
        applicant: true,
        dates: true,
        shifts: true,
      },
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundError(`Leave Application with ID [${id}] not found.`);
    }

    if (existing.status === 'APPROVED' || existing.status === 'CANCELLED') {
      throw new ValidationError(`Cannot cancel application with status [${existing.status}].`);
    }

    const updatedResult = await prisma.$transaction(async (tx) => {
      const app = await tx.leaveApplication.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
        include: {
          employee: {
            include: { department: true, designation: true, employmentType: true },
          },
          leaveType: true,
          leavePolicy: true,
          applicant: true,
          dates: { orderBy: { date: 'asc' } },
          shifts: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
        },
      });

      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_APPLICATION' as any,
          entityId: id,
          action: 'APPLICATION_CANCELLED',
          previousState: { status: existing.status },
          newState: { status: 'CANCELLED' },
          reason: cancelReason || 'Application cancelled by user',
          userId: userId || null,
        },
      });

      return app;
    });

    return this.formatApplicationDto(updatedResult);
  }

  /**
   * Retrieves single application by ID
   */
  public static async getApplicationById(tenantId: string, id: string): Promise<LeaveApplicationDto> {
    const app = await prisma.leaveApplication.findUnique({
      where: { id },
      include: {
        employee: {
          include: { department: true, designation: true, employmentType: true },
        },
        leaveType: true,
        leavePolicy: true,
        applicant: true,
        dates: { orderBy: { date: 'asc' } },
        shifts: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
        approvalInstance: {
          include: {
            steps: { include: { actionByUser: true }, orderBy: { stepNumber: 'asc' } },
            actionHistory: { include: { actor: true }, orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!app || app.tenantId !== tenantId) {
      throw new NotFoundError(`Leave Application with ID [${id}] not found.`);
    }

    return this.formatApplicationDto(app);
  }

  /**
   * Queries list of Leave Applications with filtering & search
   */
  public static async getApplications(
    tenantId: string,
    options: LeaveApplicationQueryOptions = {}
  ): Promise<{ items: LeaveApplicationDto[]; total: number }> {
    const where: any = { tenantId };

    if (options.employeeId) where.employeeId = options.employeeId;
    if (options.leaveTypeId) where.leaveTypeId = options.leaveTypeId;
    if (options.status) where.status = options.status;
    if (options.departmentId) {
      where.employee = { departmentId: options.departmentId };
    }

    if (options.startDate && options.endDate) {
      where.startDate = { lte: LeaveCalculationService.normalizeDate(options.endDate) };
      where.endDate = { gte: LeaveCalculationService.normalizeDate(options.startDate) };
    }

    if (options.search) {
      const s = options.search.trim();
      where.OR = [
        { applicationNumber: { contains: s, mode: 'insensitive' } },
        { reason: { contains: s, mode: 'insensitive' } },
        { employee: { firstNameEn: { contains: s, mode: 'insensitive' } } },
        { employee: { lastNameEn: { contains: s, mode: 'insensitive' } } },
        { employee: { employeeNo: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, apps] = await Promise.all([
      prisma.leaveApplication.count({ where }),
      prisma.leaveApplication.findMany({
        where,
        include: {
          employee: {
            include: { department: true, designation: true, employmentType: true },
          },
          leaveType: true,
          leavePolicy: true,
          applicant: true,
          dates: { orderBy: { date: 'asc' } },
          shifts: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
    ]);

    return {
      items: apps.map((a) => this.formatApplicationDto(a)),
      total,
    };
  }

  /**
   * Resolves scheduled shifts for an employee across a date range
   */
  public static async getEmployeeScheduleShifts(
    tenantId: string,
    employeeId: string,
    startDateStr: string,
    endDateStr: string
  ) {
    const startDate = LeaveCalculationService.normalizeDate(startDateStr);
    const endDate = LeaveCalculationService.normalizeDate(endDateStr);

    const result: Array<{
      date: string;
      dayOfWeek: number;
      isWorkingDay: boolean;
      shifts: Array<{
        shiftId: string;
        shiftCode: string;
        shiftName: string;
        startTime: string;
        endTime: string;
      }>;
    }> = [];

    const curr = new Date(startDate.getTime());
    while (curr <= endDate) {
      const dateStr = LeaveCalculationService.formatDateString(curr);
      const schedule = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, employeeId, curr);
      result.push({
        date: dateStr,
        dayOfWeek: curr.getUTCDay(),
        isWorkingDay: schedule?.isWorkingDay ?? true,
        shifts: (schedule?.shifts || []).map((s) => ({
          shiftId: s.shiftId,
          shiftCode: s.shiftCode,
          shiftName: s.shiftName,
          startTime: s.scheduledStartTime,
          endTime: s.scheduledEndTime,
        })),
      });
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    return result;
  }
}
