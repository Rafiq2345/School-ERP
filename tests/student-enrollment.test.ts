import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../src/lib/db/prisma';
import { StudentService } from '../src/lib/services/student-service';
import { StudentEnrollmentService } from '../src/lib/services/student-enrollment-service';
import { StudentLifecycleService } from '../src/lib/services/student-lifecycle-service';

const TEST_TENANT_ID = 'tenant-test-enrollment-mgmt';

describe('Student Enrollment & Lifecycle Tests', () => {
  let session1Id: string;
  let session2Id: string;
  let class1Id: string;
  let class2Id: string;
  let section1Id: string;
  let section2Id: string;
  let studentId: string;

  beforeEach(async () => {
    await prisma.studentStatusHistory.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.studentEnrollment.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.studentGuardianRelation.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.student.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.guardian.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.section.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.schoolClass.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.academicSession.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.tenant.deleteMany({ where: { id: TEST_TENANT_ID } });

    await prisma.tenant.create({
      data: { id: TEST_TENANT_ID, name: 'Progression Test Academy', code: 'SCH-PROG-01', status: 'ACTIVE' },
    });

    const s1 = await prisma.academicSession.create({
      data: { tenantId: TEST_TENANT_ID, name: '2025-2026 Session', code: 'S2025', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31') },
    });
    session1Id = s1.id;

    const s2 = await prisma.academicSession.create({
      data: { tenantId: TEST_TENANT_ID, name: '2026-2027 Session', code: 'S2026', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'), isCurrent: true },
    });
    session2Id = s2.id;

    const c1 = await prisma.schoolClass.create({
      data: { tenantId: TEST_TENANT_ID, name: 'Grade 1', code: 'G1' },
    });
    class1Id = c1.id;

    const c2 = await prisma.schoolClass.create({
      data: { tenantId: TEST_TENANT_ID, name: 'Grade 2', code: 'G2' },
    });
    class2Id = c2.id;

    const sec1 = await prisma.section.create({
      data: { tenantId: TEST_TENANT_ID, classId: class1Id, name: 'Section A', code: 'G1-A' },
    });
    section1Id = sec1.id;

    const sec2 = await prisma.section.create({
      data: { tenantId: TEST_TENANT_ID, classId: class2Id, name: 'Section A', code: 'G2-A' },
    });
    section2Id = sec2.id;

    // Create Initial Student
    const stu = await StudentService.createStudent(TEST_TENANT_ID, {
      firstNameEn: 'Hamza',
      gender: 'MALE',
      dob: '2018-05-15',
      admissionSessionId: session1Id,
      classId: class1Id,
      sectionId: section1Id,
      rollNumber: '01',
    });
    studentId = stu.id;
  });

  afterEach(async () => {
    await prisma.studentStatusHistory.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.studentEnrollment.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.studentGuardianRelation.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.student.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.guardian.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.section.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.schoolClass.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.academicSession.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.tenant.deleteMany({ where: { id: TEST_TENANT_ID } });
  });

  it('promotes student to next session and retains past enrollment history intact', async () => {
    const prevEnrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, academicSessionId: session1Id },
    });

    expect(prevEnrollment).toBeDefined();

    // Promote to Grade 2 in Session 2
    const nextEnrollment = await StudentEnrollmentService.promoteStudent(
      TEST_TENANT_ID,
      studentId,
      {
        fromEnrollmentId: prevEnrollment!.id,
        toSessionId: session2Id,
        toClassId: class2Id,
        toSectionId: section2Id,
        rollNumber: '04',
      },
      'usr-admin-test'
    );

    expect(nextEnrollment.isCurrent).toBe(true);
    expect(nextEnrollment.status).toBe('ACTIVE');
    expect(nextEnrollment.classId).toBe(class2Id);

    // Verify previous enrollment is preserved with isCurrent = false and status = PROMOTED
    const reloadedPrev = await prisma.studentEnrollment.findUnique({
      where: { id: prevEnrollment!.id },
    });
    expect(reloadedPrev?.isCurrent).toBe(false);
    expect(reloadedPrev?.status).toBe('PROMOTED');

    // Total enrollments in history = 2
    const totalEnrs = await prisma.studentEnrollment.count({ where: { studentId } });
    expect(totalEnrs).toBe(2);
  });

  it('handles student withdrawal lifecycle transition and updates current enrollment', async () => {
    const res = await StudentLifecycleService.changeStudentStatus(
      TEST_TENANT_ID,
      studentId,
      {
        newStatus: 'WITHDRAWN',
        reason: 'Family relocated to another city',
        leavingCertificateNo: 'SLC-2026-009',
        leavingCertificateDate: '2026-05-01',
      },
      'usr-admin-test'
    );

    expect(res.student.currentStatus).toBe('WITHDRAWN');
    expect(res.history.reason).toContain('Family relocated');
    expect(res.history.leavingCertificateNo).toBe('SLC-2026-009');

    // Current enrollment is marked not current
    const enr = await prisma.studentEnrollment.findFirst({ where: { studentId } });
    expect(enr?.isCurrent).toBe(false);
    expect(enr?.status).toBe('WITHDRAWN');
  });
});
