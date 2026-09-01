import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeaveApplicationService } from '@/lib/services/leave-application-service';
import { LeaveCalculationService } from '@/lib/services/leave-calculation-service';
import { LeaveEntitlementService } from '@/lib/services/leave-entitlement-service';
import { LeavePolicyService } from '@/lib/services/leave-policy-service';
import { LeaveAssignmentService } from '@/lib/services/leave-assignment-service';

const prisma = new PrismaClient();

describe('Leave Management Phase 2 Step 1: Applications & Validation Engine Suite', () => {
  const tenantId = 'tenant-sch-001';
  let emp101: any; // Tariq (Teaching, Standard Shift)
  let emp102: any; // Ayesha (Double Shift Security)
  let emp103: any; // Bilal (Triple Shift)
  let casualLt: any;
  let sickLt: any;
  let annualLt: any;
  let unpaidLt: any;
  let testUserId: string;

  beforeAll(async () => {
    emp101 = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-101' },
      include: { department: true, designation: true },
    });
    emp102 = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-102' },
      include: { department: true, designation: true },
    });
    emp103 = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-103' },
      include: { department: true, designation: true },
    });

    casualLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'CASUAL' } });
    sickLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'SICK' } });
    annualLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'ANNUAL' } });
    unpaidLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'UNPAID' } });

    const user = await prisma.user.findFirst({ where: { tenantId } });
    testUserId = user?.id || '00000000-0000-0000-0000-000000000001';

    // Clean only specific test-suite range applications (Oct-Dec 2026)
    const testApps = await prisma.leaveApplication.findMany({
      where: {
        tenantId,
        startDate: { gte: new Date('2026-08-01T00:00:00.000Z') },
      },
      include: { approvalInstance: true }
    });
    for (const app of testApps) {
      if (app.approvalInstance) {
        await prisma.leaveApprovalActionHistory.deleteMany({ where: { instanceId: app.approvalInstance.id } });
        await prisma.leaveRequestApprovalStep.deleteMany({ where: { instanceId: app.approvalInstance.id } });
        await prisma.leaveRequestApprovalInstance.deleteMany({ where: { id: app.approvalInstance.id } });
      }
      await prisma.leaveApplicationDate.deleteMany({ where: { applicationId: app.id } });
      await prisma.leaveApplicationShift.deleteMany({ where: { applicationId: app.id } });
      await prisma.leaveApplication.deleteMany({ where: { id: app.id } });
    }
  });

  it('1. Full-day application: Calculates working days, excludes holidays/weekly-offs, and creates application', async () => {
    // 2026-10-05 (Mon) to 2026-10-07 (Wed) -> 3 working days
    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: emp101.id,
      leaveTypeId: casualLt.id,
      startDate: '2026-10-05',
      endDate: '2026-10-07',
      leaveScope: 'FULL_DAY',
    });

    expect(preview.isValid).toBe(true);
    expect(preview.calendarSummary.totalCalendarDays).toBe(3);
    expect(preview.calendarSummary.workingDaysCount).toBe(3);
    expect(preview.calendarSummary.totalRequestedDays).toBe(3.0);
    expect(preview.dateBreakdown.length).toBe(3);

    // Create submitted application
    const app = await LeaveApplicationService.createApplication(
      tenantId,
      {
        employeeId: emp101.id,
        leaveTypeId: casualLt.id,
        startDate: '2026-10-05',
        endDate: '2026-10-07',
        leaveScope: 'FULL_DAY',
        reason: 'Attending family wedding ceremony',
      },
      testUserId
    );

    expect(app.id).toBeDefined();
    expect(app.applicationNumber).toMatch(/^LR-2026-\d{6}$/);
    expect(app.status).toBe('PENDING_APPROVAL');
    expect(app.requestedDays).toBe(3.0);
    expect(app.dates.length).toBe(3);
  });

  it('2. Half-day application: Correctly calculates 0.5d for First Half or Second Half', async () => {
    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: emp101.id,
      leaveTypeId: casualLt.id,
      startDate: '2026-10-08',
      endDate: '2026-10-08',
      leaveScope: 'HALF_DAY',
      halfDayPeriod: 'FIRST_HALF',
    });

    expect(preview.isValid).toBe(true);
    expect(preview.calendarSummary.totalRequestedDays).toBe(0.5);

    const app = await LeaveApplicationService.createApplication(
      tenantId,
      {
        employeeId: emp101.id,
        leaveTypeId: casualLt.id,
        startDate: '2026-10-08',
        endDate: '2026-10-08',
        leaveScope: 'HALF_DAY',
        halfDayPeriod: 'FIRST_HALF',
        reason: 'Personal appointment in morning session',
      },
      testUserId
    );

    expect(app.requestedDays).toBe(0.5);
    expect(app.halfDayPeriod).toBe('FIRST_HALF');
  });

  it('3 & 4. Double-shift employee selecting one shift vs both shifts', async () => {
    if (!emp102) return;

    // A. Double shift: select 1 shift (e.g. Morning Shift only -> 0.5d)
    const shiftsOnDate = await LeaveApplicationService.getEmployeeScheduleShifts(
      tenantId,
      emp102.id,
      '2026-10-12',
      '2026-10-12'
    );

    if (shiftsOnDate.length > 0 && shiftsOnDate[0].shifts.length >= 2) {
      const morningShift = shiftsOnDate[0].shifts[0];
      const preview1 = await LeaveCalculationService.calculateLeavePreview(tenantId, {
        employeeId: emp102.id,
        leaveTypeId: casualLt.id,
        startDate: '2026-10-12',
        endDate: '2026-10-12',
        leaveScope: 'SPECIFIC_SHIFT',
        selectedShifts: [
          {
            date: '2026-10-12',
            shiftId: morningShift.shiftId,
            shiftCode: morningShift.shiftCode,
            shiftName: morningShift.shiftName,
            startTime: morningShift.startTime,
            endTime: morningShift.endTime,
          },
        ],
      });

      expect(preview1.calendarSummary.totalRequestedDays).toBe(0.5);

      // B. Double shift: select BOTH shifts -> 1.0d
      const previewBoth = await LeaveCalculationService.calculateLeavePreview(tenantId, {
        employeeId: emp102.id,
        leaveTypeId: casualLt.id,
        startDate: '2026-10-12',
        endDate: '2026-10-12',
        leaveScope: 'MULTIPLE_SHIFTS',
        selectedShifts: shiftsOnDate[0].shifts.map((s) => ({
          date: '2026-10-12',
          shiftId: s.shiftId,
          shiftCode: s.shiftCode,
          shiftName: s.shiftName,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });

      expect(previewBoth.calendarSummary.totalRequestedDays).toBe(1.0);
    }
  });

  it('5. Hourly / Short Leave: Calculates exact duration hours and day fraction', async () => {
    // 09:00 to 11:00 -> 2 hours (0.25d of 8h standard day)
    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: emp101.id,
      leaveTypeId: casualLt.id,
      startDate: '2026-10-14',
      endDate: '2026-10-14',
      leaveScope: 'HOURLY',
      startTime: '09:00',
      endTime: '11:00',
    });

    expect(preview.calendarSummary.totalDurationHours).toBe(2);
    expect(preview.calendarSummary.totalRequestedDays).toBeGreaterThanOrEqual(0.25);
  });

  it('6. Invalid hourly range: Rejects when end time is earlier than or equal to start time', async () => {
    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: emp101.id,
      leaveTypeId: casualLt.id,
      startDate: '2026-10-14',
      endDate: '2026-10-14',
      leaveScope: 'HOURLY',
      startTime: '14:00',
      endTime: '12:00', // Invalid: end < start
    });

    expect(preview.isValid).toBe(false);
    expect(preview.errors.some((e) => e.code === 'INVALID_TIME_RANGE')).toBe(true);
  });

  it('7. Excludes Calendar Holidays from requested leave count', async () => {
    // Create a holiday on 2026-11-09 (Iqbal Day)
    const holiday = await prisma.schoolHoliday.create({
      data: {
        tenantId,
        title: 'Iqbal Day Test Holiday',
        startDate: new Date('2026-11-09T00:00:00.000Z'),
        endDate: new Date('2026-11-09T00:00:00.000Z'),
        holidayType: 'PUBLIC_HOLIDAY',
        scope: 'ALL',
        status: 'CONFIRMED',
      },
    });

    // Request from 2026-11-09 to 2026-11-10 (Mon-Tue: Mon is holiday, Tue is working)
    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: emp101.id,
      leaveTypeId: casualLt.id,
      startDate: '2026-11-09',
      endDate: '2026-11-10',
      leaveScope: 'FULL_DAY',
    });

    expect(preview.calendarSummary.totalCalendarDays).toBe(2);
    expect(preview.calendarSummary.holidaysCount).toBe(1);
    expect(preview.calendarSummary.workingDaysCount).toBe(1);
    expect(preview.calendarSummary.totalRequestedDays).toBe(1.0); // Holiday excluded!

    // Cleanup holiday
    await prisma.schoolHoliday.delete({ where: { id: holiday.id } });
  });

  it('8. Enforces Probation NOT ALLOWED rule strictly', async () => {
    // Set EMP-103 to PROBATION
    await prisma.employee.update({
      where: { id: emp103.id },
      data: { confirmationStatus: 'PROBATION' },
    });

    // Annual leave is NOT_ALLOWED during probation in standard policy
    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: emp103.id,
      leaveTypeId: annualLt.id,
      startDate: '2026-10-20',
      endDate: '2026-10-22',
      leaveScope: 'FULL_DAY',
    });

    expect(preview.isValid).toBe(false);
    expect(preview.errors.some((e) => e.code === 'PROBATION_NOT_ALLOWED' || e.code === 'CONFIRMATION_REQUIRED')).toBe(
      true
    );

    // Attempting to submit must throw ValidationError
    await expect(
      LeaveApplicationService.createApplication(
        tenantId,
        {
          employeeId: emp103.id,
          leaveTypeId: annualLt.id,
          startDate: '2026-10-20',
          endDate: '2026-10-22',
          leaveScope: 'FULL_DAY',
          reason: 'Annual trip during probation',
        },
        testUserId
      )
    ).rejects.toThrow(/not permitted for employees under probation|confirmation/i);

    // Restore to CONFIRMED
    await prisma.employee.update({
      where: { id: emp103.id },
      data: { confirmationStatus: 'CONFIRMED' },
    });
  });

  it('9. Enforces Negative Balance protection when policy disallows negative balances', async () => {
    // Set known tight balance of 2 days for emp101
    await prisma.employeeLeaveEntitlement.updateMany({
      where: { tenantId, employeeId: emp101.id, leaveTypeId: casualLt.id, leaveYear: 2026 },
      data: { allocatedDays: 2, availableBalance: 2, adjustedDays: 0, usedDays: 0 },
    });

    // Attempt request for 10 working days (2026-11-02 to 2026-11-13)
    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: emp101.id,
      leaveTypeId: casualLt.id,
      startDate: '2026-11-02',
      endDate: '2026-11-13', // 10 working days
      leaveScope: 'FULL_DAY',
    });

    expect(preview.isValid).toBe(false);
    expect(preview.errors.some((e) => e.code === 'INSUFFICIENT_BALANCE')).toBe(true);

    await expect(
      LeaveApplicationService.createApplication(
        tenantId,
        {
          employeeId: emp101.id,
          leaveTypeId: casualLt.id,
          startDate: '2026-11-02',
          endDate: '2026-11-13',
          leaveScope: 'FULL_DAY',
          reason: 'Excessive leave request',
        },
        testUserId
      )
    ).rejects.toThrow(/exceeds effective remaining balance/i);

    // Restore emp101 available balance for subsequent tests
    await prisma.employeeLeaveEntitlement.updateMany({
      where: { tenantId, employeeId: emp101.id, leaveTypeId: casualLt.id, leaveYear: 2026 },
      data: { allocatedDays: 20, availableBalance: 20, adjustedDays: 0, usedDays: 0 },
    });
  });

  it('10. Allows Unlimited Unpaid Leave without numeric restriction', async () => {
    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: emp101.id,
      leaveTypeId: unpaidLt.id,
      startDate: '2026-12-01',
      endDate: '2026-12-15',
      leaveScope: 'FULL_DAY',
    });

    expect(preview.isValid).toBe(true);
    expect(preview.balanceSnapshot.isUnlimited).toBe(true);
    expect(preview.errors.length).toBe(0);
  });

  it('11. Detects and blocks duplicate overlapping applications for the same employee and date', async () => {
    // First application on 2026-10-05 was created in test 1
    const duplicatePreview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: emp101.id,
      leaveTypeId: casualLt.id,
      startDate: '2026-10-05',
      endDate: '2026-10-05',
      leaveScope: 'FULL_DAY',
    });

    expect(duplicatePreview.isValid).toBe(false);
    expect(duplicatePreview.errors.some((e) => e.code === 'DUPLICATE_APPLICATION')).toBe(true);
  });

  it('12. Enforces mandatory supporting document attachment when requested quantity exceeds threshold', async () => {
    // Sick leave has attachmentThresholdDays = 2 in standard configuration
    const previewLongSick = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: emp101.id,
      leaveTypeId: sickLt.id,
      startDate: '2026-10-19',
      endDate: '2026-10-23', // 5 days > 2 days threshold
      leaveScope: 'FULL_DAY',
    });

    expect(previewLongSick.requiresAttachment).toBe(true);

    // Submitting without attachment must be blocked
    await expect(
      LeaveApplicationService.createApplication(
        tenantId,
        {
          employeeId: emp101.id,
          leaveTypeId: sickLt.id,
          startDate: '2026-10-19',
          endDate: '2026-10-23',
          leaveScope: 'FULL_DAY',
          reason: 'Severe illness hospitalization',
          attachmentUrl: null, // Missing attachment!
        },
        testUserId
      )
    ).rejects.toThrow(/supporting document attachment is mandatory/i);

    // Submitting WITH attachment URL succeeds
    const appWithDoc = await LeaveApplicationService.createApplication(
      tenantId,
      {
        employeeId: emp101.id,
        leaveTypeId: sickLt.id,
        startDate: '2026-10-19',
        endDate: '2026-10-23',
        leaveScope: 'FULL_DAY',
        reason: 'Severe illness hospitalization',
        attachmentUrl: 'https://school.edu/docs/medical_cert_101.pdf',
        attachmentName: 'medical_cert_101.pdf',
      },
      testUserId
    );

    expect(appWithDoc.isAttachmentProvided).toBe(true);
    expect(appWithDoc.attachmentUrl).toBe('https://school.edu/docs/medical_cert_101.pdf');
  });

  it('13. Draft creation does NOT consume pending balance and does NOT post to Entitlement Ledger', async () => {
    const balanceBefore = await LeaveEntitlementService.getEmployeeLeaveSummary(tenantId, emp101.id, 2026);
    const casualBefore = balanceBefore.balances.find((b) => b.leaveTypeCode === 'CASUAL');

    // Create Draft Application
    const draft = await LeaveApplicationService.createApplication(
      tenantId,
      {
        employeeId: emp101.id,
        leaveTypeId: casualLt.id,
        startDate: '2026-11-16',
        endDate: '2026-11-18',
        leaveScope: 'FULL_DAY',
        reason: 'Draft vacation plan',
        saveAsDraft: true,
      },
      testUserId
    );

    expect(draft.status).toBe('DRAFT');

    // Check that ledger balance is UNCHANGED
    const balanceAfter = await LeaveEntitlementService.getEmployeeLeaveSummary(tenantId, emp101.id, 2026);
    const casualAfter = balanceAfter.balances.find((b) => b.leaveTypeCode === 'CASUAL');
    expect(casualAfter?.usedDays).toBe(casualBefore?.usedDays);
    expect(casualAfter?.availableBalance).toBe(casualBefore?.availableBalance);

    // Check that draft can be updated and submitted
    const submitted = await LeaveApplicationService.submitApplication(tenantId, draft.id, testUserId);
    expect(submitted.status).toBe('PENDING_APPROVAL');
  });

  it('14. Submitting application captures policy snapshot and creates governance audit trail', async () => {
    const apps = await LeaveApplicationService.getApplications(tenantId, { limit: 1 });
    expect(apps.items.length).toBeGreaterThan(0);
    const app = apps.items[0];

    expect(app.policySnapshotJson).toBeDefined();
    expect(app.balanceSnapshot).toBeDefined();
    expect(app.employeeStatusSnapshot).toBeDefined();

    // Check audit log
    const auditLogs = await prisma.leaveAuditLog.findMany({
      where: { tenantId, entityId: app.id },
    });
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await prisma.leaveApplicationDate.deleteMany({ where: { tenantId } });
    await prisma.leaveApplicationShift.deleteMany({ where: { tenantId } });
    await prisma.leaveApplication.deleteMany({ where: { tenantId } });
  });
});
