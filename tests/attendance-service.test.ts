import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/db/prisma';
import { AttendanceService } from '../src/lib/services/attendance-service';

describe('Attendance Management – Phase 1 Core Foundation Tests', () => {
  const TENANT_ID = 'tenant-test-attendance-' + Date.now();
  const OTHER_TENANT_ID = 'tenant-other-attendance-' + Date.now();

  let sessionId: string;
  let classId: string;
  let sectionId: string;

  let student1Id: string;
  let student2Id: string;
  let student3Id: string;

  let enrollment1Id: string;
  let enrollment2Id: string;
  let enrollment3Id: string;

  const testDate = '2026-09-01';

  beforeAll(async () => {
    // 1. Create primary test tenant
    await prisma.tenant.create({
      data: {
        id: TENANT_ID,
        name: 'Attendance Test Academy',
        code: 'ATT-TEST-' + Math.floor(Math.random() * 10000),
        status: 'ACTIVE',
      },
    });

    // 2. Create other tenant for isolation verification
    await prisma.tenant.create({
      data: {
        id: OTHER_TENANT_ID,
        name: 'Other Academy',
        code: 'OTH-ATT-' + Math.floor(Math.random() * 10000),
        status: 'ACTIVE',
      },
    });

    // 3. Create Session, Category, Class, and Section
    const session = await prisma.academicSession.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Session 2026-2027',
        code: 'S26-27-' + Math.floor(Math.random() * 10000),
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        isCurrent: true,
      },
    });
    sessionId = session.id;

    const cat = await prisma.classCategory.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Primary',
        code: 'PRI-' + Math.floor(Math.random() * 10000),
        sortOrder: 1,
      },
    });

    const cls = await prisma.schoolClass.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Grade 5',
        code: 'G5-' + Math.floor(Math.random() * 10000),
        classCategoryId: cat.id,
        sortOrder: 5,
      },
    });
    classId = cls.id;

    const sec = await prisma.section.create({
      data: {
        tenantId: TENANT_ID,
        classId: cls.id,
        name: 'Section A',
        code: 'G5-A-' + Math.floor(Math.random() * 10000),
      },
    });
    sectionId = sec.id;

    // 4. Create 3 active Students and Enrollments
    const s1 = await prisma.student.create({
      data: {
        tenantId: TENANT_ID,
        admissionNo: 'ATT-ADM-001-' + Date.now(),
        firstNameEn: 'Ahmed',
        lastNameEn: 'Khan',
        gender: 'MALE',
        dob: new Date('2015-01-10'),
        currentStatus: 'ACTIVE',
        admissionSessionId: sessionId,
      },
    });
    student1Id = s1.id;

    const enr1 = await prisma.studentEnrollment.create({
      data: {
        tenantId: TENANT_ID,
        studentId: s1.id,
        academicSessionId: sessionId,
        classId,
        sectionId,
        rollNumber: '01',
        status: 'ACTIVE',
        isCurrent: true,
      },
    });
    enrollment1Id = enr1.id;

    const s2 = await prisma.student.create({
      data: {
        tenantId: TENANT_ID,
        admissionNo: 'ATT-ADM-002-' + Date.now(),
        firstNameEn: 'Bilal',
        lastNameEn: 'Ahmed',
        gender: 'MALE',
        dob: new Date('2015-03-15'),
        currentStatus: 'ACTIVE',
        admissionSessionId: sessionId,
      },
    });
    student2Id = s2.id;

    const enr2 = await prisma.studentEnrollment.create({
      data: {
        tenantId: TENANT_ID,
        studentId: s2.id,
        academicSessionId: sessionId,
        classId,
        sectionId,
        rollNumber: '02',
        status: 'ACTIVE',
        isCurrent: true,
      },
    });
    enrollment2Id = enr2.id;

    const s3 = await prisma.student.create({
      data: {
        tenantId: TENANT_ID,
        admissionNo: 'ATT-ADM-003-' + Date.now(),
        firstNameEn: 'Zainab',
        lastNameEn: 'Fatima',
        gender: 'FEMALE',
        dob: new Date('2015-05-20'),
        currentStatus: 'ACTIVE',
        admissionSessionId: sessionId,
      },
    });
    student3Id = s3.id;

    const enr3 = await prisma.studentEnrollment.create({
      data: {
        tenantId: TENANT_ID,
        studentId: s3.id,
        academicSessionId: sessionId,
        classId,
        sectionId,
        rollNumber: '03',
        status: 'ACTIVE',
        isCurrent: true,
      },
    });
    enrollment3Id = enr3.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.attendanceAuditLog.deleteMany({ where: { tenantId: { in: [TENANT_ID, OTHER_TENANT_ID] } } });
    await prisma.studentAttendanceRecord.deleteMany({ where: { tenantId: { in: [TENANT_ID, OTHER_TENANT_ID] } } });
    await prisma.studentEnrollment.deleteMany({ where: { tenantId: { in: [TENANT_ID, OTHER_TENANT_ID] } } });
    await prisma.student.deleteMany({ where: { tenantId: { in: [TENANT_ID, OTHER_TENANT_ID] } } });
    await prisma.section.deleteMany({ where: { tenantId: { in: [TENANT_ID, OTHER_TENANT_ID] } } });
    await prisma.schoolClass.deleteMany({ where: { tenantId: { in: [TENANT_ID, OTHER_TENANT_ID] } } });
    await prisma.classCategory.deleteMany({ where: { tenantId: { in: [TENANT_ID, OTHER_TENANT_ID] } } });
    await prisma.academicSession.deleteMany({ where: { tenantId: { in: [TENANT_ID, OTHER_TENANT_ID] } } });
    await prisma.auditLog.deleteMany({ where: { tenantId: { in: [TENANT_ID, OTHER_TENANT_ID] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [TENANT_ID, OTHER_TENANT_ID] } } });
  });

  it('1. Retrieves active student roster for attendance marking with unpopulated states', async () => {
    const res = await AttendanceService.getClassRosterForAttendance(TENANT_ID, {
      sessionId,
      classId,
      sectionId,
      date: testDate,
    });

    expect(res.roster).toHaveLength(3);
    expect(res.isAlreadyMarked).toBe(false);
    expect(res.roster[0].nameEn).toContain('Ahmed');
    expect(res.roster[0].existingAttendance).toBeNull();
  });

  it('2. Atomically saves daily attendance for class section', async () => {
    const result = await AttendanceService.saveDailyAttendance(TENANT_ID, {
      sessionId,
      classId,
      sectionId,
      date: testDate,
      records: [
        { studentId: student1Id, enrollmentId: enrollment1Id, status: 'PRESENT' },
        { studentId: student2Id, enrollmentId: enrollment2Id, status: 'ABSENT', remarks: 'Fever' },
        { studentId: student3Id, enrollmentId: enrollment3Id, status: 'LATE', remarks: 'Traffic delay' },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.createdCount).toBe(3);
    expect(result.updatedCount).toBe(0);

    // Verify in database
    const saved = await prisma.studentAttendanceRecord.findMany({
      where: { tenantId: TENANT_ID, attendanceDate: AttendanceService.normalizeDate(testDate) },
    });
    expect(saved).toHaveLength(3);
  });

  it('3. Prevents duplicate attendance for the same student on the same date', async () => {
    const normalized = AttendanceService.normalizeDate(testDate);

    // Attempting direct raw insertion of duplicate must throw unique constraint error
    await expect(
      prisma.studentAttendanceRecord.create({
        data: {
          tenantId: TENANT_ID,
          studentId: student1Id,
          enrollmentId: enrollment1Id,
          academicSessionId: sessionId,
          classId,
          sectionId,
          attendanceDate: normalized,
          status: 'PRESENT',
        },
      })
    ).rejects.toThrow();
  });

  it('4. Allows authorized attendance correction and creates immutable AttendanceAuditLog', async () => {
    // Change Student 2 from ABSENT to PRESENT with justification
    const result = await AttendanceService.saveDailyAttendance(TENANT_ID, {
      sessionId,
      classId,
      sectionId,
      date: testDate,
      records: [
        { studentId: student1Id, enrollmentId: enrollment1Id, status: 'PRESENT' },
        { studentId: student2Id, enrollmentId: enrollment2Id, status: 'PRESENT', remarks: 'Arrived after medical check' },
        { studentId: student3Id, enrollmentId: enrollment3Id, status: 'LATE', remarks: 'Traffic delay' },
      ],
      correctionReason: 'Medical slip presented; marked present as per principal approval.',
    });

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(1);
    expect(result.auditCount).toBe(1);

    // Verify audit log
    const auditLogs = await AttendanceService.getAttendanceAuditLogs(TENANT_ID, { studentId: student2Id });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].previousStatus).toBe('ABSENT');
    expect(auditLogs[0].newStatus).toBe('PRESENT');
    expect(auditLogs[0].correctionReason).toContain('Medical slip presented');
  });

  it('5. Computes accurate school-wide attendance dashboard statistics', async () => {
    const dashboard = await AttendanceService.getTodayAttendanceDashboard(TENANT_ID, testDate, sessionId);

    expect(dashboard.totalEnrolled).toBe(3);
    expect(dashboard.presentCount).toBe(2); // Student 1 (P) + Student 2 (P corrected)
    expect(dashboard.absentCount).toBe(0);
    expect(dashboard.lateCount).toBe(1); // Student 3 (L)
    expect(dashboard.unmarkedCount).toBe(0);
    expect(dashboard.attendancePercentage).toBe(100); // (2 Present + 1 Late) / 3 = 100%

    expect(dashboard.classBreakdown).toHaveLength(1);
    expect(dashboard.classBreakdown[0].isMarked).toBe(true);
  });

  it('6. Generates multi-day Attendance Register matrix', async () => {
    // Also mark for next day: Student 1 (P), Student 2 (ABSENT), Student 3 (LEAVE)
    const nextDate = '2026-09-02';
    await AttendanceService.saveDailyAttendance(TENANT_ID, {
      sessionId,
      classId,
      sectionId,
      date: nextDate,
      records: [
        { studentId: student1Id, enrollmentId: enrollment1Id, status: 'PRESENT' },
        { studentId: student2Id, enrollmentId: enrollment2Id, status: 'ABSENT' },
        { studentId: student3Id, enrollmentId: enrollment3Id, status: 'LEAVE' },
      ],
    });

    const register = await AttendanceService.getAttendanceRegister(TENANT_ID, {
      sessionId,
      classId,
      sectionId,
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    });

    expect(register.dates).toHaveLength(2);
    expect(register.matrix).toHaveLength(3);

    const s1Row = register.matrix.find((r) => r.studentId === student1Id)!;
    expect(s1Row.summary.present).toBe(2);
    expect(s1Row.summary.attendanceRate).toBe(100);

    const s2Row = register.matrix.find((r) => r.studentId === student2Id)!;
    expect(s2Row.summary.present).toBe(1);
    expect(s2Row.summary.absent).toBe(1);
    expect(s2Row.summary.attendanceRate).toBe(50);
  });

  it('7. Returns comprehensive student 360 attendance summary and logs', async () => {
    const summary = await AttendanceService.getStudentAttendanceSummary(TENANT_ID, student1Id);

    expect(summary.totalWorkingDays).toBe(2);
    expect(summary.presentDays).toBe(2);
    expect(summary.absentDays).toBe(0);
    expect(summary.attendanceRate).toBe(100);
    expect(summary.recentRecords).toHaveLength(2);
  });

  it('8. Strictly enforces multi-tenant isolation', async () => {
    // Queries from OTHER_TENANT_ID must return empty
    const otherDashboard = await AttendanceService.getTodayAttendanceDashboard(OTHER_TENANT_ID, testDate);
    expect(otherDashboard.totalEnrolled).toBe(0);
    expect(otherDashboard.presentCount).toBe(0);

    const otherRoster = await AttendanceService.getStudentAttendanceSummary(OTHER_TENANT_ID, student1Id);
    expect(otherRoster.totalWorkingDays).toBe(0);
  });
});
