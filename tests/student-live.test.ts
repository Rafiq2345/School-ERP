import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../src/lib/db/prisma';
import { StudentService } from '../src/lib/services/student-service';
import { StudentEnrollmentService } from '../src/lib/services/student-enrollment-service';
import { StudentLifecycleService } from '../src/lib/services/student-lifecycle-service';

const TEST_TENANT_ID = 'tenant-live-student-suite';

describe('Student Management Live PostgreSQL End-to-End Suite', () => {
  let session1Id: string;
  let session2Id: string;
  let class1Id: string;
  let class2Id: string;
  let section1AId: string;
  let section1BId: string;
  let section2AId: string;

  beforeEach(async () => {
    // Cleanup tenant data
    await prisma.auditLog.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.studentStatusHistory.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.studentEnrollment.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.studentGuardianRelation.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.student.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.guardian.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.section.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.schoolClass.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.academicSession.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.documentSequence.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.tenant.deleteMany({ where: { id: TEST_TENANT_ID } });

    // Seed Tenant
    await prisma.tenant.create({
      data: { id: TEST_TENANT_ID, name: 'Live Student Test Academy', code: 'SCH-LIVE-STU', status: 'ACTIVE' },
    });

    // Seed Academic Sessions
    const s1 = await prisma.academicSession.create({
      data: { tenantId: TEST_TENANT_ID, name: '2025-2026 Academic Session', code: 'SESS-2025', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31') },
    });
    session1Id = s1.id;

    const s2 = await prisma.academicSession.create({
      data: { tenantId: TEST_TENANT_ID, name: '2026-2027 Academic Session', code: 'SESS-2026', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'), isCurrent: true },
    });
    session2Id = s2.id;

    // Seed Classes & Sections
    const c1 = await prisma.schoolClass.create({
      data: { tenantId: TEST_TENANT_ID, name: 'Grade 1', code: 'G1' },
    });
    class1Id = c1.id;

    const c2 = await prisma.schoolClass.create({
      data: { tenantId: TEST_TENANT_ID, name: 'Grade 2', code: 'G2' },
    });
    class2Id = c2.id;

    const sec1A = await prisma.section.create({
      data: { tenantId: TEST_TENANT_ID, classId: class1Id, name: 'Section A', code: 'G1-A' },
    });
    section1AId = sec1A.id;

    const sec1B = await prisma.section.create({
      data: { tenantId: TEST_TENANT_ID, classId: class1Id, name: 'Section B', code: 'G1-B' },
    });
    section1BId = sec1B.id;

    const sec2A = await prisma.section.create({
      data: { tenantId: TEST_TENANT_ID, classId: class2Id, name: 'Section A', code: 'G2-A' },
    });
    section2AId = sec2A.id;
  });

  afterEach(async () => {
    await prisma.auditLog.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.studentStatusHistory.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.studentEnrollment.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.studentGuardianRelation.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.student.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.guardian.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.section.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.schoolClass.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.academicSession.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.documentSequence.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.tenant.deleteMany({ where: { id: TEST_TENANT_ID } });
  });

  it('executes full student lifecycle: admission -> sibling link -> bulk section transfer -> promotion -> withdrawal', async () => {
    // 1. Admit Student 1
    const stu1 = await StudentService.createStudent(
      TEST_TENANT_ID,
      {
        firstNameEn: 'Haris',
        lastNameEn: 'Rauf',
        fullNameUr: 'حارث رؤف',
        gender: 'MALE',
        dob: '2018-02-10',
        bloodGroup: 'B_POS',
        admissionSessionId: session1Id,
        classId: class1Id,
        sectionId: section1AId,
        rollNumber: '01',
        guardian: {
          fullNameEn: 'Rauf Ahmed',
          nationalId: '37405-1122334-9',
          primaryPhone: '0300-5544332',
          relationshipType: 'FATHER',
          occupation: 'Civil Engineer',
        },
      }
    );

    expect(stu1.admissionNo).toBe('ADM-1001');
    expect(stu1.currentStatus).toBe('ACTIVE');

    // 2. Admit Sibling (Student 2) with matching CNIC
    const stu2 = await StudentService.createStudent(
      TEST_TENANT_ID,
      {
        firstNameEn: 'Fatima',
        lastNameEn: 'Rauf',
        fullNameUr: 'فاطمہ رؤف',
        gender: 'FEMALE',
        dob: '2019-06-15',
        admissionSessionId: session1Id,
        classId: class1Id,
        sectionId: section1AId,
        rollNumber: '02',
        guardian: {
          fullNameEn: 'Rauf Ahmed',
          nationalId: '37405-1122334-9',
          primaryPhone: '0300-5544332',
          relationshipType: 'FATHER',
        },
      }
    );

    expect(stu2.admissionNo).toBe('ADM-1002');

    // Verify Sibling relationship in DB
    const guardiansCount = await prisma.guardian.count({ where: { tenantId: TEST_TENANT_ID } });
    expect(guardiansCount).toBe(1);

    // 3. Bulk reassign Student 1 from Section A to Section B
    const bulkRes = await StudentEnrollmentService.bulkAssignSection(
      TEST_TENANT_ID,
      [stu1.id],
      section1BId
    );
    expect(bulkRes.count).toBe(1);

    const reloadedEnr1 = await prisma.studentEnrollment.findFirst({
      where: { studentId: stu1.id, isCurrent: true },
    });
    expect(reloadedEnr1?.sectionId).toBe(section1BId);

    // 4. Promote Student 1 to Grade 2 in Session 2
    const promotedEnr = await StudentEnrollmentService.promoteStudent(
      TEST_TENANT_ID,
      stu1.id,
      {
        fromEnrollmentId: reloadedEnr1!.id,
        toSessionId: session2Id,
        toClassId: class2Id,
        toSectionId: section2AId,
        rollNumber: '07',
        enrollmentType: 'PROMOTION',
      }
    );

    expect(promotedEnr.classId).toBe(class2Id);
    expect(promotedEnr.sectionId).toBe(section2AId);
    expect(promotedEnr.isCurrent).toBe(true);

    // Verify previous enrollment status is PROMOTED
    const pastEnr = await prisma.studentEnrollment.findUnique({ where: { id: reloadedEnr1!.id } });
    expect(pastEnr?.isCurrent).toBe(false);
    expect(pastEnr?.status).toBe('PROMOTED');

    // 5. Withdraw Student 1
    const withdrawal = await StudentLifecycleService.changeStudentStatus(
      TEST_TENANT_ID,
      stu1.id,
      {
        newStatus: 'WITHDRAWN',
        reason: 'Relocated abroad',
        leavingCertificateNo: 'SLC-LIVE-889',
      }
    );

    expect(withdrawal.student.currentStatus).toBe('WITHDRAWN');
    expect(withdrawal.history.leavingCertificateNo).toBe('SLC-LIVE-889');

    // 6. Fetch 360 profile and verify integrity
    const p360 = await StudentService.getStudentById(TEST_TENANT_ID, stu1.id);
    expect(p360.siblings.length).toBe(1);
    expect(p360.siblings[0].id).toBe(stu2.id);
    expect(p360.enrollments.length).toBe(2);
    expect(p360.statusHistories.length).toBe(3); // Initial + Promotion + Withdrawal
  });
});
