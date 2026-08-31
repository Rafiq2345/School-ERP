import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../src/lib/db/prisma';
import { StudentService } from '../src/lib/services/student-service';
import { StudentLifecycleService } from '../src/lib/services/student-lifecycle-service';

const TENANT_A = 'tenant-test-lifecycle-a';
const TENANT_B = 'tenant-test-lifecycle-b';

describe('Student Lifecycle & Status Management Tests', () => {
  let sessionA: any;
  let classA: any;
  let sectionA: any;
  let student1: any;

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
        { id: TENANT_A, name: 'Academy Alpha', code: 'SCH-LFC-1', status: 'ACTIVE' },
        { id: TENANT_B, name: 'Academy Beta', code: 'SCH-LFC-2', status: 'ACTIVE' },
      ],
    });

    // Masters for Tenant A
    sessionA = await prisma.academicSession.create({
      data: { tenantId: TENANT_A, name: 'Session 2026-2027', code: 'S26', startDate: new Date(), endDate: new Date(), isCurrent: true },
    });
    classA = await prisma.schoolClass.create({
      data: { tenantId: TENANT_A, name: 'Grade 7', code: 'G7', sortOrder: 7 },
    });
    sectionA = await prisma.section.create({
      data: { tenantId: TENANT_A, classId: classA.id, name: 'Section B', code: 'G7-B', capacity: 30 },
    });

    // Create Initial Student
    student1 = await StudentService.createStudent(
      TENANT_A,
      {
        admissionSessionId: sessionA.id,
        classId: classA.id,
        sectionId: sectionA.id,
        admissionDate: '2026-04-01',
        firstNameEn: 'Hamza',
        lastNameEn: 'Khan',
        gender: 'MALE',
        dob: '2013-09-10',
        guardian: {
          fullNameEn: 'Imran Khan',
          primaryPhone: '0300-1122334',
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

  it('transitions student status to WITHDRAWN with SLC and preserves academic enrollment record', async () => {
    const result = await StudentLifecycleService.changeStudentStatus(
      TENANT_A,
      student1.id,
      {
        newStatus: 'WITHDRAWN',
        reason: 'Family relocated to Islamabad',
        effectiveDate: '2026-05-15',
        leavingCertificateNo: 'SLC-2026-778',
        leavingCertificateDate: '2026-05-15',
        remarks: 'All dues cleared. SLC issued to father.',
      },
      'usr-admin'
    );

    expect(result.student.currentStatus).toBe('WITHDRAWN');
    expect(result.history.newStatus).toBe('WITHDRAWN');
    expect(result.history.leavingCertificateNo).toBe('SLC-2026-778');

    // CRITICAL: Verify enrollment record was marked non-current, NOT deleted
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: student1.id, tenantId: TENANT_A },
    });
    expect(enrollments.length).toBe(1);
    expect(enrollments[0].isCurrent).toBe(false);
    expect(enrollments[0].status).toBe('WITHDRAWN');

    // Verify status history list
    const historyList = await StudentLifecycleService.getStudentStatusHistory(TENANT_A, student1.id);
    expect(historyList.length).toBeGreaterThanOrEqual(1);
    expect(historyList[0].newStatus).toBe('WITHDRAWN');
  });

  it('reactivates a withdrawn student and restores active enrollment', async () => {
    // 1. Withdraw
    await StudentLifecycleService.changeStudentStatus(
      TENANT_A,
      student1.id,
      {
        newStatus: 'WITHDRAWN',
        reason: 'Family relocated',
      },
      'usr-admin'
    );

    // 2. Reactivate
    const reactivation = await StudentLifecycleService.changeStudentStatus(
      TENANT_A,
      student1.id,
      {
        newStatus: 'ACTIVE',
        reason: 'Family returned to city; re-admitted to same grade',
      },
      'usr-admin'
    );

    expect(reactivation.student.currentStatus).toBe('ACTIVE');

    // Verify enrollment restored to active
    const currentEnr = await prisma.studentEnrollment.findFirst({
      where: { studentId: student1.id, tenantId: TENANT_A, isCurrent: true },
    });
    expect(currentEnr).not.toBeNull();
    expect(currentEnr?.status).toBe('ACTIVE');
  });

  it('prevents accidental duplicate lifecycle transition to identical status', async () => {
    // Student is currently ACTIVE
    await expect(
      StudentLifecycleService.changeStudentStatus(
        TENANT_A,
        student1.id,
        {
          newStatus: 'ACTIVE',
          reason: 'Duplicate check',
        },
        'usr-admin'
      )
    ).rejects.toThrow("Student is already in 'ACTIVE' status.");
  });

  it('enforces mandatory transition reason', async () => {
    await expect(
      StudentLifecycleService.changeStudentStatus(
        TENANT_A,
        student1.id,
        {
          newStatus: 'SUSPENDED',
          reason: '',
        },
        'usr-admin'
      )
    ).rejects.toThrow('A valid reason is required');
  });

  it('enforces tenant isolation on lifecycle transitions', async () => {
    await expect(
      StudentLifecycleService.changeStudentStatus(
        TENANT_B,
        student1.id,
        {
          newStatus: 'WITHDRAWN',
          reason: 'Cross-tenant attack',
        },
        'usr-admin-b'
      )
    ).rejects.toThrow('Student record not found.');
  });
});
