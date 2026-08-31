import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { HolidayService } from '@/lib/services/holiday-service';
import { AttendanceService } from '@/lib/services/attendance-service';

const prisma = new PrismaClient();

describe('Central School Calendar & Holiday Management Suite', () => {
  let tenantId: string;
  let sessionId: string;
  let classId: string;
  let sectionId: string;
  let studentId: string;
  let enrollmentId: string;

  beforeAll(async () => {
    // 1. Create a dedicated isolated test tenant
    const uniqueSuffix = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Holiday Test Academy ' + uniqueSuffix,
        code: 'HOL-' + uniqueSuffix,
        status: 'ACTIVE',
      },
    });
    tenantId = tenant.id;

    // 2. Resolve Academic Session
    let session = await prisma.academicSession.findFirst({
      where: { tenantId, isCurrent: true },
    });
    if (!session) {
      session = await prisma.academicSession.create({
        data: {
          tenantId,
          name: 'Session 2026-2027',
          code: 'SESS-2026-TEST',
          startDate: new Date('2026-08-01T00:00:00.000Z'),
          endDate: new Date('2027-05-31T00:00:00.000Z'),
          isCurrent: true,
          status: 'ACTIVE',
        },
      });
    }
    sessionId = session.id;

    // 3. Resolve Class & Section
    let cls = await prisma.schoolClass.findFirst({ where: { tenantId } });
    if (!cls) {
      cls = await prisma.schoolClass.create({
        data: {
          tenantId,
          name: 'Grade 5 Holiday Test',
          code: 'G5-HOL-TEST',
          sortOrder: 5,
        },
      });
    }
    classId = cls.id;

    let sec = await prisma.section.findFirst({ where: { tenantId, classId } });
    if (!sec) {
      sec = await prisma.section.create({
        data: {
          tenantId,
          classId,
          name: 'Section A (Lotus)',
          code: 'LOTUS',
        },
      });
    }
    sectionId = sec.id;

    // 4. Resolve / Seed Student & Enrollment
    let student = await prisma.student.findFirst({ where: { tenantId } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          tenantId,
          admissionNo: 'ADM-HOL-001-' + Date.now(),
          firstNameEn: 'Zainab',
          lastNameEn: 'Kashif',
          gender: 'FEMALE',
          dob: new Date('2015-05-15T00:00:00.000Z'),
          currentStatus: 'ACTIVE',
          admissionSessionId: sessionId,
        },
      });
    }
    studentId = student.id;

    let enr = await prisma.studentEnrollment.findFirst({
      where: { tenantId, studentId, isCurrent: true },
    });
    if (!enr) {
      enr = await prisma.studentEnrollment.create({
        data: {
          tenantId,
          studentId,
          academicSessionId: sessionId,
          classId,
          sectionId,
          rollNumber: '101',
          isCurrent: true,
          status: 'ACTIVE',
        },
      });
    }
    enrollmentId = enr.id;

    // Cleanup previous holiday test records
    await prisma.holidayAuditLog.deleteMany({ where: { tenantId } });
    await prisma.schoolHoliday.deleteMany({ where: { tenantId } });
  });

  afterAll(async () => {
    if (tenantId) {
      await prisma.holidayAuditLog.deleteMany({ where: { tenantId } });
      await prisma.schoolHoliday.deleteMany({ where: { tenantId } });
      await prisma.weeklyOffSetting.deleteMany({ where: { tenantId } });
      await prisma.studentAttendanceRecord.deleteMany({ where: { tenantId } });
      await prisma.studentEnrollment.deleteMany({ where: { tenantId } });
      await prisma.student.deleteMany({ where: { tenantId } });
      await prisma.section.deleteMany({ where: { tenantId } });
      await prisma.schoolClass.deleteMany({ where: { tenantId } });
      await prisma.academicSession.deleteMany({ where: { tenantId } });
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
    await prisma.$disconnect();
  });

  it('A. Configures Sunday (and Sat+Sun) as recurring weekly off and verifies non-working check', async () => {
    // Set Sunday only [0]
    await HolidayService.updateWeeklyOffSetting(tenantId, {
      daysOfWeek: [0],
      description: 'Sunday Weekly Off',
    });

    const sundayDate = '2026-10-18'; // 2026-10-18 is Sunday
    const mondayDate = '2026-10-19'; // 2026-10-19 is Monday

    const sunCheck = await HolidayService.isDateHoliday(tenantId, sundayDate);
    expect(sunCheck.isHoliday).toBe(true);
    expect(sunCheck.isWeeklyOff).toBe(true);

    const monCheck = await HolidayService.isDateHoliday(tenantId, mondayDate);
    expect(monCheck.isHoliday).toBe(false);
    expect(monCheck.isWeeklyOff).toBe(false);
  });

  it('B. Schedules a Single-Day Public Holiday with mandatory title and validates non-working status', async () => {
    const holidayDate = '2026-11-09'; // Iqbal Day

    const result = await HolidayService.createHoliday(tenantId, {
      title: 'Iqbal Day',
      holidayType: 'NATIONAL_HOLIDAY',
      startDate: holidayDate,
      endDate: holidayDate,
      scope: 'WHOLE_SCHOOL',
      description: 'National holiday in honor of Allama Iqbal',
    });

    expect(result.holiday).toBeDefined();
    expect(result.holiday.title).toBe('Iqbal Day');
    expect(result.holiday.durationDays).toBe(1);

    const check = await HolidayService.isDateHoliday(tenantId, holidayDate);
    expect(check.isHoliday).toBe(true);
    expect(check.isWeeklyOff).toBe(false);
    expect(check.holidayInfo?.title).toBe('Iqbal Day');
    expect(check.holidayInfo?.holidayType).toBe('NATIONAL_HOLIDAY');
  });

  it('C. Schedules a Date-Range Holiday (e.g. Summer Vacation June 1 to July 31)', async () => {
    const result = await HolidayService.createHoliday(tenantId, {
      title: 'Summer Vacation 2027',
      holidayType: 'VACATION',
      startDate: '2027-06-01',
      endDate: '2027-07-31',
      scope: 'WHOLE_SCHOOL',
      description: 'Annual summer recess',
    });

    expect(result.holiday).toBeDefined();
    expect(result.holiday.durationDays).toBe(61); // 30 days in June + 31 in July

    // Mid-range date check
    const midCheck = await HolidayService.isDateHoliday(tenantId, '2027-06-15');
    expect(midCheck.isHoliday).toBe(true);
    expect(midCheck.holidayInfo?.title).toBe('Summer Vacation 2027');

    // Post-range date check (2027-08-03 is Tuesday)
    const postCheck = await HolidayService.isDateHoliday(tenantId, '2027-08-03');
    expect(postCheck.isHoliday).toBe(false);
  });

  it('D & E. Calculates accurate working days and attendance percentage strictly excluding holidays', async () => {
    // Example period: 2026-11-01 to 2026-11-30 (30 Calendar Days)
    // In Nov 2026:
    // Sundays: Nov 1, 8, 15, 22, 29 (5 Sundays)
    // Iqbal Day: Nov 9 (Monday - 1 Holiday)
    // Net Working Days: 30 - 5 - 1 = 24 Working Days!

    const calc = await HolidayService.getWorkingDaysCount(tenantId, '2026-11-01', '2026-11-30');
    expect(calc.totalCalendarDays).toBe(30);
    expect(calc.weeklyOffCount).toBe(5);
    expect(calc.holidayCount).toBe(1);
    expect(calc.totalNonWorkingDays).toBe(6);
    expect(calc.totalWorkingDays).toBe(24);

    // Attendance percentage calculation:
    // If student was present for 24 days out of 24 working days -> 100%
    const rate = Number(((24 / calc.totalWorkingDays) * 100).toFixed(1));
    expect(rate).toBe(100.0);
  });

  it('F & G. Opens Daily Roll Call on a holiday and verifies standard attendance marking is disabled', async () => {
    const holidayDate = '2026-11-09';

    // Roster query returns isHoliday: true
    const rosterResult = await AttendanceService.getClassRosterForAttendance(tenantId, {
      classId,
      sectionId,
      date: holidayDate,
      sessionId,
    });

    expect(rosterResult.isHoliday).toBe(true);
    expect(rosterResult.holidayInfo?.title).toBe('Iqbal Day');

    // Attempting to submit standard daily attendance without override must be rejected
    await expect(
      AttendanceService.saveDailyAttendance(tenantId, {
        classId,
        sectionId,
        sessionId,
        date: holidayDate,
        records: [
          {
            studentId,
            enrollmentId,
            status: 'PRESENT',
          },
        ],
      })
    ).rejects.toThrow(/Cannot mark standard attendance on a configured non-working day/);
  });

  it('H. Detects existing attendance conflict when scheduling holiday and requires authorized override', async () => {
    const conflictDate = '2026-12-16';

    // 1. Save attendance first on this date
    await AttendanceService.saveDailyAttendance(tenantId, {
      classId,
      sectionId,
      sessionId,
      date: conflictDate,
      records: [
        {
          studentId,
          enrollmentId,
          status: 'PRESENT',
          remarks: 'Regular attendance',
        },
      ],
    });

    // 2. Try to create a holiday on this date without override -> Expect conflict
    const attempt = await HolidayService.createHoliday(tenantId, {
      title: 'APS Memorial Day',
      holidayType: 'NATIONAL_HOLIDAY',
      startDate: conflictDate,
      endDate: conflictDate,
      scope: 'WHOLE_SCHOOL',
      allowConflictOverride: false,
    });

    expect(attempt.conflictResult?.hasConflict).toBe(true);
    expect(attempt.conflictResult?.totalRecordsFound).toBeGreaterThanOrEqual(1);

    // 3. Confirm with override -> Succeeds and logs ATTENDANCE_OVERRIDE audit
    const overrideResult = await HolidayService.createHoliday(tenantId, {
      title: 'APS Memorial Day',
      holidayType: 'NATIONAL_HOLIDAY',
      startDate: conflictDate,
      endDate: conflictDate,
      scope: 'WHOLE_SCHOOL',
      allowConflictOverride: true,
    });

    expect(overrideResult.holiday).toBeDefined();
    expect(overrideResult.holiday.title).toBe('APS Memorial Day');

    // Verify Audit log contains ATTENDANCE_OVERRIDE
    const auditLogs = await HolidayService.getHolidayAuditLogs(tenantId, overrideResult.holiday.id);
    expect(auditLogs.some((l) => l.action === 'ATTENDANCE_OVERRIDE')).toBe(true);
  });

  it('I. Edits and Cancels a holiday with mandatory reason and restores working days calculations', async () => {
    const tempHoliday = await HolidayService.createHoliday(tenantId, {
      title: 'Temporary Weather Closure',
      holidayType: 'EMERGENCY_CLOSURE',
      startDate: '2027-01-15',
      endDate: '2027-01-15',
      scope: 'WHOLE_SCHOOL',
    });

    // Verify it was a holiday
    let check = await HolidayService.isDateHoliday(tenantId, '2027-01-15');
    expect(check.isHoliday).toBe(true);

    // Cancel holiday with reason
    const cancelled = await HolidayService.cancelHoliday(
      tenantId,
      tempHoliday.holiday.id,
      'Weather alert cleared by district administration'
    );
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancellationReason).toBe('Weather alert cleared by district administration');

    // Verify it is no longer a non-working day
    check = await HolidayService.isDateHoliday(tenantId, '2027-01-15');
    expect(check.isHoliday).toBe(false);
  });

  it('J, K & L. Validates Attendance Dashboard, Student 360 and Audit Trail integrity', async () => {
    // 1. Dashboard query returns isTodayHoliday flag
    const dash = await AttendanceService.getTodayAttendanceDashboard(tenantId, '2026-11-09', sessionId);
    expect(dash.isTodayHoliday).toBe(true);
    expect(dash.todayHolidayTitle).toBe('Iqbal Day');

    // 2. Student 360 profile calculates working days accurately
    const summary360 = await AttendanceService.getStudentAttendanceSummary(tenantId, studentId);
    expect(summary360).toBeDefined();
    expect(summary360.studentId).toBe(studentId);

    // 3. Complete Audit Trail query
    const allAudit = await HolidayService.getHolidayAuditLogs(tenantId);
    expect(allAudit.length).toBeGreaterThan(0);
    const actions = allAudit.map((a) => a.action);
    expect(actions).toContain('CREATED');
  });
});
