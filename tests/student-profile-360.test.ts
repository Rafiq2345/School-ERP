import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../src/lib/db/prisma';
import { StudentService } from '../src/lib/services/student-service';

const TENANT_A = 'tenant-test-profile-a';
const TENANT_B = 'tenant-test-profile-b';

describe('Student Profile 360° & Documents Service Tests', () => {
  let sessionA: any;
  let classA: any;
  let sectionA: any;
  let student1: any;
  let student2: any;

  beforeEach(async () => {
    // Cleanup
    await prisma.studentDocument.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.studentStatusHistory.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.studentEnrollment.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.studentGuardianRelation.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.guardian.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.student.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.section.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.schoolClass.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.academicSession.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.auditLog.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });

    // Create Tenants
    await prisma.tenant.createMany({
      data: [
        { id: TENANT_A, name: 'Academy Alpha', code: 'SCH-P360-1', status: 'ACTIVE' },
        { id: TENANT_B, name: 'Academy Beta', code: 'SCH-P360-2', status: 'ACTIVE' },
      ],
    });

    // Masters for Tenant A
    sessionA = await prisma.academicSession.create({
      data: { tenantId: TENANT_A, name: 'Session 2026-2027', code: 'S26', startDate: new Date(), endDate: new Date(), isCurrent: true },
    });
    classA = await prisma.schoolClass.create({
      data: { tenantId: TENANT_A, name: 'Grade 5', code: 'G5', sortOrder: 5 },
    });
    sectionA = await prisma.section.create({
      data: { tenantId: TENANT_A, classId: classA.id, name: 'Section A', code: 'G5-A', capacity: 30 },
    });

    // Create Elder Brother with Guardian
    student1 = await StudentService.createStudent(
      TENANT_A,
      {
        admissionSessionId: sessionA.id,
        classId: classA.id,
        sectionId: sectionA.id,
        admissionDate: '2026-04-01',
        firstNameEn: 'Zaid',
        lastNameEn: 'Tariq',
        fullNameUr: 'زید طارق',
        gender: 'MALE',
        dob: '2014-05-12',
        bloodGroup: 'B_POS',
        guardian: {
          fullNameEn: 'Tariq Mahmood',
          nationalId: '42101-7788990-1',
          primaryPhone: '0300-9988776',
          relationshipType: 'FATHER',
          occupation: 'Civil Engineer',
        },
      },
      'usr-admin'
    );

    // Create Younger Sister linking to same Guardian CNIC (Sibling Link)
    student2 = await StudentService.createStudent(
      TENANT_A,
      {
        admissionSessionId: sessionA.id,
        classId: classA.id,
        sectionId: sectionA.id,
        admissionDate: '2026-04-01',
        firstNameEn: 'Ayesha',
        lastNameEn: 'Tariq',
        gender: 'FEMALE',
        dob: '2016-08-20',
        guardian: {
          fullNameEn: 'Tariq Mahmood',
          nationalId: '42101-7788990-1',
          primaryPhone: '0300-9988776',
          relationshipType: 'FATHER',
        },
      },
      'usr-admin'
    );
  });

  afterEach(async () => {
    await prisma.studentDocument.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.studentStatusHistory.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.studentEnrollment.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.studentGuardianRelation.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.guardian.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.student.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.section.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.schoolClass.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.academicSession.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.auditLog.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
  });

  it('retrieves comprehensive 360 profile with academic placement, family, and sibling tree', async () => {
    const profile = await StudentService.getStudentById(TENANT_A, student1.id);

    expect(profile.id).toBe(student1.id);
    expect(profile.firstNameEn).toBe('Zaid');
    expect(profile.fullNameUr).toBe('زید طارق');
    expect(profile.currentStatus).toBe('ACTIVE');

    // Enrollments
    expect(profile.enrollments.length).toBe(1);
    expect(profile.enrollments[0].schoolClass.name).toBe('Grade 5');
    expect(profile.enrollments[0].section.name).toBe('Section A');
    expect(profile.enrollments[0].academicSession.name).toBe('Session 2026-2027');

    // Guardians
    expect(profile.guardians.length).toBe(1);
    expect(profile.guardians[0].guardian.fullNameEn).toBe('Tariq Mahmood');
    expect(profile.guardians[0].guardian.nationalId).toBe('42101-7788990-1');

    // Auto-aggregated Siblings
    expect(profile.siblings.length).toBe(1);
    expect(profile.siblings[0].id).toBe(student2.id);
    expect(profile.siblings[0].nameEn).toBe('Ayesha Tariq');
  });

  it('adds and verifies official student documents in 360 profile', async () => {
    const doc = await StudentService.addStudentDocument(
      TENANT_A,
      student1.id,
      {
        documentType: 'B_FORM',
        title: 'Nadra B-Form Official Attested Copy',
        documentUrl: 'https://cdn.school.local/docs/zaid_bform.pdf',
        fileSize: 204800,
        mimeType: 'application/pdf',
      },
      'usr-admin'
    );

    expect(doc.id).toBeDefined();
    expect(doc.title).toBe('Nadra B-Form Official Attested Copy');

    // Reload 360 profile
    const profile = await StudentService.getStudentById(TENANT_A, student1.id);
    expect(profile.documents.length).toBe(1);
    expect(profile.documents[0].documentType).toBe('B_FORM');
    expect(profile.documents[0].title).toBe('Nadra B-Form Official Attested Copy');
  });

  it('enforces strict tenant isolation preventing cross-tenant student profile access', async () => {
    await expect(StudentService.getStudentById(TENANT_B, student1.id)).rejects.toThrow(
      'Student record not found.'
    );
  });
});
