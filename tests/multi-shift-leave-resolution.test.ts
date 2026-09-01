import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeaveApplicationService } from '@/lib/services/leave-application-service';
import { LeaveCalculationService } from '@/lib/services/leave-calculation-service';

const prisma = new PrismaClient();

describe('Multi-Shift Duty Leave Resolution & Proportional Quantity Suite', () => {
  const tenantId = 'tenant-sch-001';
  let fatimaEmp102: any;
  let tariqEmp101: any;
  let usmanEmp104: any;
  let casualLeaveType: any;

  beforeAll(async () => {
    fatimaEmp102 = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-102' },
    });
    tariqEmp101 = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-101' },
    });
    usmanEmp104 = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-104' },
    });
    casualLeaveType = await prisma.leaveType.findFirst({
      where: { tenantId, code: 'CASUAL' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Verifies Double-Shift Employee (Fatima EMP-102) resolves 2 duty shifts on 2026-09-01 (Tuesday)', async () => {
    const shiftsResult = await LeaveApplicationService.getEmployeeScheduleShifts(
      tenantId,
      fatimaEmp102.id,
      '2026-09-01',
      '2026-09-01'
    );

    expect(shiftsResult).toBeDefined();
    expect(shiftsResult.length).toBe(1);
    expect(shiftsResult[0].date).toBe('2026-09-01');
    expect(shiftsResult[0].isWorkingDay).toBe(true);

    const shifts = shiftsResult[0].shifts;
    expect(shifts.length).toBe(2);
    expect(shifts[0].shiftName).toContain('Morning');
    expect(shifts[1].shiftName).toContain('Afternoon');
  });

  it('2. Double-Shift Employee: Selecting 1 of 2 shifts consumes exactly 0.5d leave quantity', async () => {
    const shiftsResult = await LeaveApplicationService.getEmployeeScheduleShifts(
      tenantId,
      fatimaEmp102.id,
      '2026-09-01',
      '2026-09-01'
    );
    const morningShift = shiftsResult[0].shifts[0];

    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: fatimaEmp102.id,
      leaveTypeId: casualLeaveType.id,
      startDate: '2026-09-01',
      endDate: '2026-09-01',
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        {
          date: '2026-09-01',
          shiftId: morningShift.shiftId,
          shiftCode: morningShift.shiftCode,
          shiftName: morningShift.shiftName,
          startTime: morningShift.startTime,
          endTime: morningShift.endTime,
        },
      ],
    });

    expect(preview.calendarSummary.totalRequestedDays).toBe(0.5);
    expect(preview.shiftBreakdown.length).toBe(1);
    expect(preview.shiftBreakdown[0].leaveFraction).toBe(0.5);
    expect(preview.errors.length).toBe(0);
  });

  it('3. Double-Shift Employee: Selecting both shifts consumes 1.0d full working-day leave quantity', async () => {
    const shiftsResult = await LeaveApplicationService.getEmployeeScheduleShifts(
      tenantId,
      fatimaEmp102.id,
      '2026-09-01',
      '2026-09-01'
    );
    const [morningShift, afternoonShift] = shiftsResult[0].shifts;

    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: fatimaEmp102.id,
      leaveTypeId: casualLeaveType.id,
      startDate: '2026-09-01',
      endDate: '2026-09-01',
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        {
          date: '2026-09-01',
          shiftId: morningShift.shiftId,
          shiftCode: morningShift.shiftCode,
          shiftName: morningShift.shiftName,
          startTime: morningShift.startTime,
          endTime: morningShift.endTime,
        },
        {
          date: '2026-09-01',
          shiftId: afternoonShift.shiftId,
          shiftCode: afternoonShift.shiftCode,
          shiftName: afternoonShift.shiftName,
          startTime: afternoonShift.startTime,
          endTime: afternoonShift.endTime,
        },
      ],
    });

    expect(preview.calendarSummary.totalRequestedDays).toBe(1.0);
    expect(preview.shiftBreakdown.length).toBe(2);
    expect(preview.errors.length).toBe(0);
  });

  it('4. Single-Shift Employee (Tariq EMP-101): Resolves 1 shift and consumes 1.0d', async () => {
    const shiftsResult = await LeaveApplicationService.getEmployeeScheduleShifts(
      tenantId,
      tariqEmp101.id,
      '2026-09-01',
      '2026-09-01'
    );

    expect(shiftsResult[0].shifts.length).toBe(1);
    const standardShift = shiftsResult[0].shifts[0];

    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: tariqEmp101.id,
      leaveTypeId: casualLeaveType.id,
      startDate: '2026-09-01',
      endDate: '2026-09-01',
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        {
          date: '2026-09-01',
          shiftId: standardShift.shiftId,
          shiftCode: standardShift.shiftCode,
          shiftName: standardShift.shiftName,
          startTime: standardShift.startTime,
          endTime: standardShift.endTime,
        },
      ],
    });

    expect(preview.calendarSummary.totalRequestedDays).toBe(1.0);
    expect(preview.errors.length).toBe(0);
  });

  it('5. Triple-Shift Employee (Usman EMP-104): Resolves 3 shifts and calculates proportional quantities', async () => {
    const shiftsResult = await LeaveApplicationService.getEmployeeScheduleShifts(
      tenantId,
      usmanEmp104.id,
      '2026-09-01',
      '2026-09-01'
    );

    expect(shiftsResult[0].shifts.length).toBe(3);
    const [s1, s2, s3] = shiftsResult[0].shifts;

    // 1 shift of 3 -> 0.33d
    const preview1 = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: usmanEmp104.id,
      leaveTypeId: casualLeaveType.id,
      startDate: '2026-09-01',
      endDate: '2026-09-01',
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        { date: '2026-09-01', shiftId: s1.shiftId, shiftCode: s1.shiftCode, shiftName: s1.shiftName, startTime: s1.startTime, endTime: s1.endTime },
      ],
    });
    expect(preview1.calendarSummary.totalRequestedDays).toBe(0.33);

    // All 3 shifts -> 1.0d
    const previewAll = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: usmanEmp104.id,
      leaveTypeId: casualLeaveType.id,
      startDate: '2026-09-01',
      endDate: '2026-09-01',
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        { date: '2026-09-01', shiftId: s1.shiftId, shiftCode: s1.shiftCode, shiftName: s1.shiftName, startTime: s1.startTime, endTime: s1.endTime },
        { date: '2026-09-01', shiftId: s2.shiftId, shiftCode: s2.shiftCode, shiftName: s2.shiftName, startTime: s2.startTime, endTime: s2.endTime },
        { date: '2026-09-01', shiftId: s3.shiftId, shiftCode: s3.shiftCode, shiftName: s3.shiftName, startTime: s3.startTime, endTime: s3.endTime },
      ],
    });
    expect(previewAll.calendarSummary.totalRequestedDays).toBe(1.0);
  });
});
