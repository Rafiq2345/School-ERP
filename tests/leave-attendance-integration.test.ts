import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeaveApplicationService } from '@/lib/services/leave-application-service';
import { LeaveApprovalService } from '@/lib/services/leave-approval-service';
import { LeaveAttendanceIntegrationService } from '@/lib/services/leave-attendance-integration-service';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';

const prisma = new PrismaClient();

describe.sequential('Leave Management Phase 2 - Step 3: Final Approved Leave → Attendance Auto-Integration Suite', () => {
  const tenantId = 'tenant-sch-001';
  let fatima: any;
  let ahmad: any;
  let casualLt: any;
  let annualLt: any;
  let morningShift: any;
  let afternoonShift: any;
  let eveningShift: any;
  let fullShift: any;
  let tripleSchedule: any;

  beforeAll(async () => {
    fatima = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-102' },
      include: { department: true, designation: true },
    });
    ahmad = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-101' },
      include: { department: true, designation: true },
    });

    casualLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'CASUAL' } });
    annualLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'ANNUAL' } });

    morningShift = await prisma.shift.findFirst({ where: { tenantId, code: 'SHIFT-MRN' } });
    afternoonShift = await prisma.shift.findFirst({ where: { tenantId, code: 'SHIFT-AFT' } });
    eveningShift = await prisma.shift.findFirst({ where: { tenantId, code: 'SHIFT-EVN' } });
    fullShift = await prisma.shift.findFirst({ where: { tenantId, code: 'SHIFT-FULL' } });

    tripleSchedule = await prisma.workSchedule.findFirst({
      where: { tenantId, code: 'WS-TRIPLE-3X' },
    });

    // Enable allowHourly, allowHalfDay, allowShiftWise across all leave types and rules
    await prisma.leaveType.updateMany({
      where: { tenantId },
      data: { allowHourly: true, allowHalfDay: true, allowShiftWise: true },
    });

    await prisma.leavePolicyRule.updateMany({
      where: { leavePolicy: { tenantId } },
      data: { allowHourly: true, allowHalfDay: true, allowShiftWise: true },
    });

    // Ensure generous 2026 Entitlements
    for (const emp of [fatima, ahmad]) {
      for (const lt of [casualLt, annualLt]) {
        await prisma.employeeLeaveEntitlement.updateMany({
          where: { tenantId, employeeId: emp.id, leaveTypeId: lt.id, leaveYear: 2026 },
          data: { allocatedDays: 15, usedDays: 0, adjustedDays: 0, availableBalance: 15 },
        });
      }
    }

    // Clean old assignments and assign WS-TRIPLE-3X to Fatima for 2026
    await prisma.employeeScheduleAssignment.deleteMany({
      where: { tenantId, employeeId: fatima.id },
    });

    if (tripleSchedule) {
      await prisma.employeeScheduleAssignment.create({
        data: {
          id: 'fatima-triple-schedule-assignment',
          tenantId,
          scheduleId: tripleSchedule.id,
          employeeId: fatima.id,
          assignmentType: 'EMPLOYEE',
          isOverride: true,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveTo: new Date('2026-12-31T00:00:00.000Z'),
          isActive: true,
        },
      });
    }

    // Clean prior test artifacts for 2026-11-xx dates
    const startTestDate = new Date('2026-11-01T00:00:00.000Z');
    const endTestDate = new Date('2026-11-30T00:00:00.000Z');

    const priorApps = await prisma.leaveApplication.findMany({
      where: {
        tenantId,
        startDate: { gte: startTestDate, lte: endTestDate },
      },
      include: { approvalInstance: true },
    });

    for (const a of priorApps) {
      if (a.approvalInstance) {
        await prisma.leaveApprovalActionHistory.deleteMany({ where: { instanceId: a.approvalInstance.id } });
        await prisma.leaveRequestApprovalStep.deleteMany({ where: { instanceId: a.approvalInstance.id } });
        await prisma.leaveRequestApprovalInstance.deleteMany({ where: { id: a.approvalInstance.id } });
      }
      await prisma.employeeAttendanceAuditLog.deleteMany({
        where: { tenantId, attendanceDate: { gte: startTestDate, lte: endTestDate } },
      });
      await prisma.employeeAttendanceRecord.deleteMany({
        where: { tenantId, attendanceDate: { gte: startTestDate, lte: endTestDate } },
      });
      await prisma.leaveLedgerTransaction.deleteMany({ where: { referenceId: a.id } });
      await prisma.leaveApplicationDate.deleteMany({ where: { applicationId: a.id } });
      await prisma.leaveApplicationShift.deleteMany({ where: { applicationId: a.id } });
      await prisma.leaveApplication.deleteMany({ where: { id: a.id } });
    }
  });

  afterAll(async () => {
    // Cleanup test records
    const startTestDate = new Date('2026-11-01T00:00:00.000Z');
    const endTestDate = new Date('2026-11-30T00:00:00.000Z');

    const priorApps = await prisma.leaveApplication.findMany({
      where: {
        tenantId,
        startDate: { gte: startTestDate, lte: endTestDate },
      },
      include: { approvalInstance: true },
    });

    for (const a of priorApps) {
      if (a.approvalInstance) {
        await prisma.leaveApprovalActionHistory.deleteMany({ where: { instanceId: a.approvalInstance.id } });
        await prisma.leaveRequestApprovalStep.deleteMany({ where: { instanceId: a.approvalInstance.id } });
        await prisma.leaveRequestApprovalInstance.deleteMany({ where: { id: a.approvalInstance.id } });
      }
      await prisma.employeeAttendanceAuditLog.deleteMany({
        where: { tenantId, attendanceDate: { gte: startTestDate, lte: endTestDate } },
      });
      await prisma.employeeAttendanceRecord.deleteMany({
        where: { tenantId, attendanceDate: { gte: startTestDate, lte: endTestDate } },
      });
      await prisma.leaveLedgerTransaction.deleteMany({ where: { referenceId: a.id } });
      await prisma.leaveApplicationDate.deleteMany({ where: { applicationId: a.id } });
      await prisma.leaveApplicationShift.deleteMany({ where: { applicationId: a.id } });
      await prisma.leaveApplication.deleteMany({ where: { id: a.id } });
    }

    await prisma.employeeScheduleAssignment.deleteMany({
      where: { id: 'fatima-triple-schedule-assignment' },
    });

    // Reconcile Fatima's canonical 2026 Casual Leave state (Allocated=3, Used=0.5, Available=2.5)
    await prisma.employeeLeaveEntitlement.updateMany({
      where: { tenantId, employeeId: fatima.id, leaveTypeId: casualLt.id, leaveYear: 2026 },
      data: { allocatedDays: 3, usedDays: 0.5, adjustedDays: 0, availableBalance: 2.5 },
    });

    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Pending Leave Non-Affect
  // ---------------------------------------------------------------------------
  it('1. Pending Leave Request does NOT affect Attendance records', async () => {
    const testDateStr = '2026-11-02';
    const testDate = new Date(Date.UTC(2026, 10, 2, 0, 0, 0, 0));

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualLt.id,
      startDate: testDateStr,
      endDate: testDateStr,
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        {
          date: testDateStr,
          shiftId: morningShift.id,
          shiftCode: morningShift.code,
          shiftName: morningShift.name,
          startTime: morningShift.startTime,
          endTime: morningShift.endTime,
          leaveFraction: 0.5,
        },
      ],
      reason: 'Doctor checkup',
    });

    expect(app.status).toBe('PENDING_APPROVAL');

    const integrationResult = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(
      tenantId,
      app.id
    );

    expect(integrationResult.createdAttendanceRecords).toBe(0);
    expect(integrationResult.updatedAttendanceRecords).toBe(0);

    const records = await prisma.employeeAttendanceRecord.findMany({
      where: { tenantId, employeeId: fatima.id, attendanceDate: testDate },
    });
    expect(records.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Draft / Rejected Non-Affect
  // ---------------------------------------------------------------------------
  it('2. Rejected Leave Request does NOT generate ON_LEAVE attendance records', async () => {
    const testDateStr = '2026-11-02';
    const testDate = new Date(Date.UTC(2026, 10, 2, 0, 0, 0, 0));

    const app = await prisma.leaveApplication.findFirst({
      where: { tenantId, employeeId: fatima.id, startDate: testDate },
    });

    await prisma.leaveApplication.update({
      where: { id: app!.id },
      data: { status: 'REJECTED' },
    });

    const integrationResult = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(
      tenantId,
      app!.id
    );

    expect(integrationResult.createdAttendanceRecords).toBe(0);

    const records = await prisma.employeeAttendanceRecord.findMany({
      where: { tenantId, employeeId: fatima.id, attendanceDate: testDate },
    });
    expect(records.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Specific Shift Final Approval Integration (Morning Shift Only)
  // ---------------------------------------------------------------------------
  it('3. Approved Specific Shift Leave marks Morning Shift as ON_LEAVE and preserves other shifts', async () => {
    const testDateStr = '2026-11-03';
    const testDate = new Date(Date.UTC(2026, 10, 3, 0, 0, 0, 0));

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualLt.id,
      startDate: testDateStr,
      endDate: testDateStr,
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        {
          date: testDateStr,
          shiftId: morningShift.id,
          shiftCode: morningShift.code,
          shiftName: morningShift.name,
          startTime: morningShift.startTime,
          endTime: morningShift.endTime,
          leaveFraction: 0.5,
        },
      ],
      reason: 'Morning Shift Consultation',
    });

    await prisma.leaveApplication.update({
      where: { id: app.id },
      data: { status: 'APPROVED' },
    });

    const integrationResult = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(
      tenantId,
      app.id
    );

    expect(integrationResult.createdAttendanceRecords).toBe(1);
    expect(integrationResult.integratedShiftIds).toContain(morningShift.id);

    // Verify DB Attendance Record for Morning Shift
    const mrnRecord = await prisma.employeeAttendanceRecord.findUnique({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId,
          employeeId: fatima.id,
          attendanceDate: testDate,
          shiftId: morningShift.id,
        },
      },
    });

    expect(mrnRecord).toBeDefined();
    expect(mrnRecord!.status).toBe('ON_LEAVE');
    expect(mrnRecord!.leaveTypeId).toBe(casualLt.id);
    expect(mrnRecord!.leaveApplicationId).toBe(app.id);
    expect(mrnRecord!.leaveScope).toBe('SPECIFIC_SHIFT');
    expect(mrnRecord!.punchSource).toBe('LEAVE_INTEGRATION');

    // Verify Afternoon Shift is NOT in DB
    const aftRecord = await prisma.employeeAttendanceRecord.findUnique({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId,
          employeeId: fatima.id,
          attendanceDate: testDate,
          shiftId: afternoonShift.id,
        },
      },
    });
    expect(aftRecord).toBeNull();

    // Verify Roster Resolution renders Morning Shift as ON_LEAVE
    const rosterResult = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, testDateStr, {
      search: 'Fatima',
    });
    const fatimaRoster = rosterResult.roster.find((r) => r.employee.employeeNo === 'EMP-102');
    expect(fatimaRoster).toBeDefined();

    const segMrn = fatimaRoster!.shiftSegments.find((s) => s.shiftCode === 'SHIFT-MRN');
    expect(segMrn).toBeDefined();
    expect(segMrn!.status).toBe('ON_LEAVE');
    expect(segMrn!.leaveApplicationNumber).toBe(app.applicationNumber);
    expect(segMrn!.leaveTypeName).toBe('Casual Leave');
  });

  // ---------------------------------------------------------------------------
  // Test 4: Specific Shift Final Approval Integration (Afternoon Shift Only)
  // ---------------------------------------------------------------------------
  it('4. Approved Specific Shift Leave for Afternoon Shift leaves Morning Shift untouched', async () => {
    const testDateStr = '2026-11-04';
    const testDate = new Date(Date.UTC(2026, 10, 4, 0, 0, 0, 0));

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualLt.id,
      startDate: testDateStr,
      endDate: testDateStr,
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        {
          date: testDateStr,
          shiftId: afternoonShift.id,
          shiftCode: afternoonShift.code,
          shiftName: afternoonShift.name,
          startTime: afternoonShift.startTime,
          endTime: afternoonShift.endTime,
          leaveFraction: 0.5,
        },
      ],
      reason: 'Afternoon family emergency',
    });

    await prisma.leaveApplication.update({
      where: { id: app.id },
      data: { status: 'APPROVED' },
    });

    await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(tenantId, app.id);

    const aftRecord = await prisma.employeeAttendanceRecord.findUnique({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId,
          employeeId: fatima.id,
          attendanceDate: testDate,
          shiftId: afternoonShift.id,
        },
      },
    });

    expect(aftRecord).toBeDefined();
    expect(aftRecord!.status).toBe('ON_LEAVE');

    const mrnRecord = await prisma.employeeAttendanceRecord.findUnique({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId,
          employeeId: fatima.id,
          attendanceDate: testDate,
          shiftId: morningShift.id,
        },
      },
    });
    expect(mrnRecord).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Test 5: Multi-Shift Triple Shift Middle Shift Approved
  // ---------------------------------------------------------------------------
  it('5. Triple Shift schedule where middle shift is approved marks ONLY middle shift ON_LEAVE', async () => {
    const testDateStr = '2026-11-05';
    const testDate = new Date(Date.UTC(2026, 10, 5, 0, 0, 0, 0));

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualLt.id,
      startDate: testDateStr,
      endDate: testDateStr,
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        {
          date: testDateStr,
          shiftId: afternoonShift.id,
          shiftCode: afternoonShift.code,
          shiftName: afternoonShift.name,
          startTime: afternoonShift.startTime,
          endTime: afternoonShift.endTime,
          leaveFraction: 0.5,
        },
      ],
      reason: 'Middle shift personal emergency',
    });

    await prisma.leaveApplication.update({
      where: { id: app.id },
      data: { status: 'APPROVED' },
    });

    const res = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(tenantId, app.id);
    expect(res.createdAttendanceRecords).toBe(1);

    const records = await prisma.employeeAttendanceRecord.findMany({
      where: { tenantId, employeeId: fatima.id, attendanceDate: testDate },
    });
    expect(records.length).toBe(1);
    expect(records[0].shiftId).toBe(afternoonShift.id);
    expect(records[0].status).toBe('ON_LEAVE');

    const rosterResult = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, testDateStr, {
      search: 'Fatima',
    });
    const fatimaRoster = rosterResult.roster.find((r) => r.employee.employeeNo === 'EMP-102');
    const segMrn = fatimaRoster!.shiftSegments.find((s) => s.shiftCode === 'SHIFT-MRN');
    const segAft = fatimaRoster!.shiftSegments.find((s) => s.shiftCode === 'SHIFT-AFT');
    const segEvn = fatimaRoster!.shiftSegments.find((s) => s.shiftCode === 'SHIFT-EVN');

    expect(segMrn).toBeDefined();
    expect(segAft).toBeDefined();
    expect(segEvn).toBeDefined();

    expect(segMrn!.status).toBe('PRESENT');
    expect(segAft!.status).toBe('ON_LEAVE');
    expect(segEvn!.status).toBe('PRESENT');
  });

  // ---------------------------------------------------------------------------
  // Test 6: Full Day Leave for Multi-Shift Employee
  // ---------------------------------------------------------------------------
  it('6. Approved FULL_DAY leave marks all duty schedule shifts as ON_LEAVE', async () => {
    const testDateStr = '2026-11-06';
    const testDate = new Date(Date.UTC(2026, 10, 6, 0, 0, 0, 0));

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: annualLt.id,
      startDate: testDateStr,
      endDate: testDateStr,
      leaveScope: 'FULL_DAY',
      reason: 'Full day annual leave',
    });

    await prisma.leaveApplication.update({
      where: { id: app.id },
      data: { status: 'APPROVED' },
    });

    const res = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(tenantId, app.id);
    expect(res.createdAttendanceRecords).toBe(3); // Fatima has Triple shift (MRN, AFT, EVN)

    const records = await prisma.employeeAttendanceRecord.findMany({
      where: { tenantId, employeeId: fatima.id, attendanceDate: testDate },
    });
    expect(records.length).toBe(3);
    expect(records.every((r) => r.status === 'ON_LEAVE' && r.leaveScope === 'FULL_DAY')).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 7: Multi-Day Full Day Leave (Non-Holiday Working Days)
  // ---------------------------------------------------------------------------
  it('7. Multi-Day FULL_DAY leave integrates across all consecutive working dates', async () => {
    const startDateStr = '2026-11-10'; // Tuesday
    const endDateStr = '2026-11-11'; // Wednesday

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: ahmad.id,
      leaveTypeId: annualLt.id,
      startDate: startDateStr,
      endDate: endDateStr,
      leaveScope: 'FULL_DAY',
      reason: '2-day conference',
    });

    await prisma.leaveApplication.update({
      where: { id: app.id },
      data: { status: 'APPROVED' },
    });

    const res = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(tenantId, app.id);
    expect(res.createdAttendanceRecords).toBe(2);

    const d1 = new Date(Date.UTC(2026, 10, 10, 0, 0, 0, 0));
    const d2 = new Date(Date.UTC(2026, 10, 11, 0, 0, 0, 0));

    const r1 = await prisma.employeeAttendanceRecord.findFirst({
      where: { tenantId, employeeId: ahmad.id, attendanceDate: d1 },
    });
    const r2 = await prisma.employeeAttendanceRecord.findFirst({
      where: { tenantId, employeeId: ahmad.id, attendanceDate: d2 },
    });

    expect(r1!.status).toBe('ON_LEAVE');
    expect(r2!.status).toBe('ON_LEAVE');
  });

  // ---------------------------------------------------------------------------
  // Test 8: Calendar Holiday Exclusion
  // ---------------------------------------------------------------------------
  it('8. Leave overlapping holiday does NOT overwrite holiday/off-day with ON_LEAVE', async () => {
    const holidayDateStr = '2026-11-09'; // Iqbal Day Public Holiday

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: ahmad.id,
      leaveTypeId: casualLt.id,
      startDate: holidayDateStr,
      endDate: holidayDateStr,
      leaveScope: 'FULL_DAY',
      reason: 'Holiday leave attempt',
    });

    await prisma.leaveApplication.update({
      where: { id: app.id },
      data: { status: 'APPROVED' },
    });

    const res = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(tenantId, app.id);
    expect(res.createdAttendanceRecords).toBe(0); // Excluded due to Iqbal Day Holiday
  });

  // ---------------------------------------------------------------------------
  // Test 9: Half Day Leave (FIRST_HALF)
  // ---------------------------------------------------------------------------
  it('9. Half Day (FIRST_HALF) leave maps to first scheduled shift segment', async () => {
    const testDateStr = '2026-11-16';
    const testDate = new Date(Date.UTC(2026, 10, 16, 0, 0, 0, 0));

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualLt.id,
      startDate: testDateStr,
      endDate: testDateStr,
      leaveScope: 'HALF_DAY',
      halfDayPeriod: 'FIRST_HALF',
      reason: 'Morning half day',
    });

    await prisma.leaveApplication.update({
      where: { id: app.id },
      data: { status: 'APPROVED' },
    });

    const res = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(tenantId, app.id);
    expect(res.createdAttendanceRecords).toBe(1);

    const rec = await prisma.employeeAttendanceRecord.findFirst({
      where: {
        tenantId,
        employeeId: fatima.id,
        attendanceDate: testDate,
        shiftId: morningShift.id,
      },
    });

    expect(rec).toBeDefined();
    expect(rec!.status).toBe('ON_LEAVE');
    expect(rec!.halfDayPeriod).toBe('FIRST_HALF');
  });

  // ---------------------------------------------------------------------------
  // Test 10: Half Day Leave (SECOND_HALF)
  // ---------------------------------------------------------------------------
  it('10. Half Day (SECOND_HALF) leave maps to last scheduled shift segment', async () => {
    const testDateStr = '2026-11-17';
    const testDate = new Date(Date.UTC(2026, 10, 17, 0, 0, 0, 0));

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualLt.id,
      startDate: testDateStr,
      endDate: testDateStr,
      leaveScope: 'HALF_DAY',
      halfDayPeriod: 'SECOND_HALF',
      reason: 'Evening half day',
    });

    await prisma.leaveApplication.update({
      where: { id: app.id },
      data: { status: 'APPROVED' },
    });

    const res = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(tenantId, app.id);
    expect(res.createdAttendanceRecords).toBe(1);

    const rec = await prisma.employeeAttendanceRecord.findFirst({
      where: {
        tenantId,
        employeeId: fatima.id,
        attendanceDate: testDate,
        shiftId: eveningShift.id,
      },
    });

    expect(rec).toBeDefined();
    expect(rec!.status).toBe('ON_LEAVE');
    expect(rec!.halfDayPeriod).toBe('SECOND_HALF');
  });

  // ---------------------------------------------------------------------------
  // Test 11: Hourly / Short Leave Interval
  // ---------------------------------------------------------------------------
  it('11. Hourly Leave preserves interval without marking entire shift ON_LEAVE', async () => {
    const testDateStr = '2026-11-18';
    const testDate = new Date(Date.UTC(2026, 10, 18, 0, 0, 0, 0));

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: ahmad.id,
      leaveTypeId: casualLt.id,
      startDate: testDateStr,
      endDate: testDateStr,
      leaveScope: 'HOURLY',
      startTime: '10:00',
      endTime: '12:00',
      reason: '2-hour urgent errand',
    });

    await prisma.leaveApplication.update({
      where: { id: app.id },
      data: { status: 'APPROVED' },
    });

    const res = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(tenantId, app.id);
    expect(res.createdAttendanceRecords).toBe(1);

    const rec = await prisma.employeeAttendanceRecord.findFirst({
      where: { tenantId, employeeId: ahmad.id, attendanceDate: testDate },
    });

    expect(rec).toBeDefined();
    expect(rec!.leaveScope).toBe('HOURLY');
    expect(rec!.leaveStartTime).toBe('10:00');
    expect(rec!.leaveEndTime).toBe('12:00');
    expect(rec!.status).toBe('PRESENT'); // Working status preserved
  });

  // ---------------------------------------------------------------------------
  // Test 12: Existing Attendance Record Conflict & Audit Log
  // ---------------------------------------------------------------------------
  it('12. Existing manual ABSENT record is updated to ON_LEAVE and writes Audit Log', async () => {
    const testDateStr = '2026-11-19';
    const testDate = new Date(Date.UTC(2026, 10, 19, 0, 0, 0, 0));

    // Seed existing manual ABSENT record
    const existingRec = await prisma.employeeAttendanceRecord.create({
      data: {
        tenantId,
        employeeId: ahmad.id,
        attendanceDate: testDate,
        shiftId: fullShift ? fullShift.id : morningShift.id,
        status: 'ABSENT',
        punchSource: 'MANUAL',
        remarks: 'Staff did not report',
      },
    });

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: ahmad.id,
      leaveTypeId: casualLt.id,
      startDate: testDateStr,
      endDate: testDateStr,
      leaveScope: 'FULL_DAY',
      reason: 'Late submitted approved leave',
    });

    await prisma.leaveApplication.update({
      where: { id: app.id },
      data: { status: 'APPROVED' },
    });

    const res = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(tenantId, app.id);
    expect(res.updatedAttendanceRecords).toBe(1);
    expect(res.auditLogsCreated).toBe(1);

    // Verify record was updated
    const updatedRec = await prisma.employeeAttendanceRecord.findUnique({
      where: { id: existingRec.id },
    });
    expect(updatedRec!.status).toBe('ON_LEAVE');

    // Verify audit log exists
    const auditLog = await prisma.employeeAttendanceAuditLog.findFirst({
      where: { tenantId, attendanceRecordId: existingRec.id },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog!.previousStatus).toBe('ABSENT');
    expect(auditLog!.newStatus).toBe('ON_LEAVE');
    expect(auditLog!.correctionReason).toContain(app.applicationNumber);
  });

  // ---------------------------------------------------------------------------
  // Test 13: Strict Idempotency
  // ---------------------------------------------------------------------------
  it('13. Replaying integration multiple times produces ZERO duplicate records or audits', async () => {
    const testDateStr = '2026-11-20';
    const testDate = new Date(Date.UTC(2026, 10, 20, 0, 0, 0, 0));

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualLt.id,
      startDate: testDateStr,
      endDate: testDateStr,
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        {
          date: testDateStr,
          shiftId: morningShift.id,
          shiftCode: morningShift.code,
          shiftName: morningShift.name,
          startTime: morningShift.startTime,
          endTime: morningShift.endTime,
          leaveFraction: 0.5,
        },
      ],
      reason: 'Idempotency verification test',
    });

    await prisma.leaveApplication.update({
      where: { id: app.id },
      data: { status: 'APPROVED' },
    });

    // Pass 1
    const run1 = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(tenantId, app.id);
    expect(run1.createdAttendanceRecords).toBe(1);

    // Pass 2 (Retry)
    const run2 = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(tenantId, app.id);
    expect(run2.createdAttendanceRecords).toBe(0);
    expect(run2.updatedAttendanceRecords).toBe(0);
    expect(run2.auditLogsCreated).toBe(0);

    // Pass 3 (Retry)
    const run3 = await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(tenantId, app.id);
    expect(run3.createdAttendanceRecords).toBe(0);
    expect(run3.updatedAttendanceRecords).toBe(0);

    const count = await prisma.employeeAttendanceRecord.count({
      where: { tenantId, employeeId: fatima.id, attendanceDate: testDate },
    });
    expect(count).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Test 14: End-to-End Dynamic Workflow Step Approval Hook
  // ---------------------------------------------------------------------------
  it('14. Complete multi-step approval workflow triggers attendance integration on final step approval', async () => {
    const testDateStr = '2026-11-23';
    const testDate = new Date(Date.UTC(2026, 10, 23, 0, 0, 0, 0));

    // 1. Submit leave
    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualLt.id,
      startDate: testDateStr,
      endDate: testDateStr,
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        {
          date: testDateStr,
          shiftId: morningShift.id,
          shiftCode: morningShift.code,
          shiftName: morningShift.name,
          startTime: morningShift.startTime,
          endTime: morningShift.endTime,
          leaveFraction: 0.5,
        },
      ],
      reason: 'End-to-End Approval Hook Test',
    });

    // 2. Initialize Approval Instance
    const instance = await LeaveApprovalService.initializeApprovalInstance(tenantId, app.id);

    expect(instance).toBeDefined();
    expect(instance.steps.length).toBe(3);

    // Step 1: Department Incharge Approve (Attendance should still be NOT integrated)
    await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: app.id,
      actionInput: {
        action: 'APPROVE',
        remarks: 'Step 1 Approved',
      },
      actorRoles: ['DEPARTMENT_HEAD'],
    });

    let attRec = await prisma.employeeAttendanceRecord.findFirst({
      where: { tenantId, employeeId: fatima.id, attendanceDate: testDate },
    });
    expect(attRec).toBeNull();

    // Step 2: Principal Approve (Attendance should still be NOT integrated)
    await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: app.id,
      actionInput: {
        action: 'APPROVE',
        remarks: 'Step 2 Approved',
      },
      actorRoles: ['PRINCIPAL'],
    });

    attRec = await prisma.employeeAttendanceRecord.findFirst({
      where: { tenantId, employeeId: fatima.id, attendanceDate: testDate },
    });
    expect(attRec).toBeNull();

    // Step 3: HR Office FINAL Approve (Triggers ledger deduction AND Attendance auto-integration!)
    await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: app.id,
      actionInput: {
        action: 'APPROVE',
        remarks: 'Step 3 Final Approved',
      },
      actorRoles: ['HR_MANAGER'],
    });

    // Verify Attendance record is automatically created and integrated
    attRec = await prisma.employeeAttendanceRecord.findUnique({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId,
          employeeId: fatima.id,
          attendanceDate: testDate,
          shiftId: morningShift.id,
        },
      },
    });

    expect(attRec).toBeDefined();
    expect(attRec!.status).toBe('ON_LEAVE');
    expect(attRec!.leaveApplicationId).toBe(app.id);
    expect(attRec!.leaveTypeId).toBe(casualLt.id);
  });
});
