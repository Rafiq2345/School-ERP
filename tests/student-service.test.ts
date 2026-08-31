import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../src/lib/db/prisma';
import { StudentService } from '../src/lib/services/student-service';

const TEST_TENANT_ID = 'tenant-test-student-mgmt';

describe('Student Service Unit Tests', () => {
  let activeSessionId: string;
  let classId: string;
  let sectionId: string;

  beforeEach(async () => {
    // Clean up
    await prisma.studentStatusHistory.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.studentEnrollment.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.studentGuardianRelation.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.student.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.guardian.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.section.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.schoolClass.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.academicSession.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.tenant.deleteMany({ where: { id: TEST_TENANT_ID } });

    // Seed base tenant & academic masters
    await prisma.tenant.create({
      data: {
        id: TEST_TENANT_ID,
        name: 'Student Test Academy',
        code: 'SCH-STU-01',
        status: 'ACTIVE',
      },
    });

    const session = await prisma.academicSession.create({
      data: {
        tenantId: TEST_TENANT_ID,
        name: '2026-2027 Academic Session',
        code: 'SESS-2026',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        isCurrent: true,
      },
    });
    activeSessionId = session.id;

    const schoolClass = await prisma.schoolClass.create({
      data: {
        tenantId: TEST_TENANT_ID,
        name: 'Grade 5',
        code: 'G5',
      },
    });
    classId = schoolClass.id;

    const section = await prisma.section.create({
      data: {
        tenantId: TEST_TENANT_ID,
        classId: schoolClass.id,
        name: 'Section A - Green',
        code: 'G5-A',
      },
    });
    sectionId = section.id;
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

  it('creates a new student with auto-generated admission number and initial enrollment', async () => {
    const student = await StudentService.createStudent(
      TEST_TENANT_ID,
      {
        firstNameEn: 'Zain',
        lastNameEn: 'Ahmed',
        fullNameUr: 'زین احمد',
        gender: 'MALE',
        dob: '2015-08-14',
        admissionSessionId: activeSessionId,
        classId,
        sectionId,
        rollNumber: '05',
        guardian: {
          fullNameEn: 'Ahmed Khan',
          primaryPhone: '0300-1122334',
          relationshipType: 'FATHER',
        },
      },
      'usr-admin-test'
    );

    expect(student.id).toBeDefined();
    expect(student.admissionNo).toContain('ADM-');
    expect(student.currentStatus).toBe('ACTIVE');

    // Verify enrollment
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: student.id, tenantId: TEST_TENANT_ID },
    });
    expect(enrollments.length).toBe(1);
    expect(enrollments[0].classId).toBe(classId);
    expect(enrollments[0].sectionId).toBe(sectionId);
    expect(enrollments[0].isCurrent).toBe(true);

    // Verify guardian
    const guardians = await prisma.studentGuardianRelation.findMany({
      where: { studentId: student.id, tenantId: TEST_TENANT_ID },
      include: { guardian: true },
    });
    expect(guardians.length).toBe(1);
    expect(guardians[0].guardian.fullNameEn).toBe('Ahmed Khan');
  });

  it('links siblings to the same guardian record when CNIC matches without duplication', async () => {
    // 1. Create Sibling 1
    const student1 = await StudentService.createStudent(
      TEST_TENANT_ID,
      {
        firstNameEn: 'Ayesha',
        lastNameEn: 'Malik',
        gender: 'FEMALE',
        dob: '2014-03-10',
        admissionSessionId: activeSessionId,
        classId,
        sectionId,
        guardian: {
          fullNameEn: 'Tariq Malik',
          nationalId: '42101-5555555-1',
          primaryPhone: '0321-7788990',
          relationshipType: 'FATHER',
        },
      }
    );

    // 2. Create Sibling 2 with same CNIC
    const student2 = await StudentService.createStudent(
      TEST_TENANT_ID,
      {
        firstNameEn: 'Bilal',
        lastNameEn: 'Malik',
        gender: 'MALE',
        dob: '2016-11-20',
        admissionSessionId: activeSessionId,
        classId,
        sectionId,
        guardian: {
          fullNameEn: 'Tariq Malik',
          nationalId: '42101-5555555-1',
          primaryPhone: '0321-7788990',
          relationshipType: 'FATHER',
        },
      }
    );

    // Verify total guardians created in DB is exactly 1!
    const totalGuardians = await prisma.guardian.count({ where: { tenantId: TEST_TENANT_ID } });
    expect(totalGuardians).toBe(1);

    // Verify Student 360 profile returns sibling
    const p360 = await StudentService.getStudentById(TEST_TENANT_ID, student1.id);
    expect(p360.siblings.length).toBe(1);
    expect(p360.siblings[0].id).toBe(student2.id);
  });
});
