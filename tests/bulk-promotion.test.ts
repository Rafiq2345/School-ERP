import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../src/lib/db/prisma';
import { StudentService } from '../src/lib/services/student-service';
import { PromotionService } from '../src/lib/services/promotion-service';

const TENANT_A = 'tenant-test-promo-a';
const TENANT_B = 'tenant-test-promo-b';

describe('Bulk Promotion, Graduation & Rollback Integration Suite', () => {
  let session2026A: any;
  let session2027A: any;
  let class5A: any;
  let class6A: any;
  let class10A: any; // Terminal class
  let section5A: any;
  let section6A: any;
  let section10A: any;
  let student1: any; // will be promoted
  let student2: any; // will repeat
  let student3: any; // will be held
  let student4: any; // withdrawn student
  let studentGrad: any; // final class student for graduation

  beforeEach(async () => {
    // 1. Cleanup
    await prisma.promotionBatchItem.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.promotionBatch.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
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

    // 2. Create Tenants
    await prisma.tenant.createMany({
      data: [
        { id: TENANT_A, name: 'Academy Alpha', code: 'SCH-PRM-1', status: 'ACTIVE' },
        { id: TENANT_B, name: 'Academy Beta', code: 'SCH-PRM-2', status: 'ACTIVE' },
      ],
    });

    // 3. Academic Sessions
    session2026A = await prisma.academicSession.create({
      data: { tenantId: TENANT_A, name: 'Session 2026', code: 'S26', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'), isCurrent: true },
    });
    session2027A = await prisma.academicSession.create({
      data: { tenantId: TENANT_A, name: 'Session 2027', code: 'S27', startDate: new Date('2027-04-01'), endDate: new Date('2028-03-31'), isCurrent: false },
    });

    // 4. Classes & Sections
    class5A = await prisma.schoolClass.create({
      data: { tenantId: TENANT_A, name: 'Grade 5', code: 'G5', sortOrder: 5 },
    });
    class6A = await prisma.schoolClass.create({
      data: { tenantId: TENANT_A, name: 'Grade 6', code: 'G6', sortOrder: 6 },
    });
    class10A = await prisma.schoolClass.create({
      data: { tenantId: TENANT_A, name: 'Grade 10 (Matric)', code: 'G10', sortOrder: 10 },
    });

    section5A = await prisma.section.create({
      data: { tenantId: TENANT_A, classId: class5A.id, name: 'Section A', code: 'G5-A', capacity: 30 },
    });
    section6A = await prisma.section.create({
      data: { tenantId: TENANT_A, classId: class6A.id, name: 'Section A', code: 'G6-A', capacity: 30 },
    });
    section10A = await prisma.section.create({
      data: { tenantId: TENANT_A, classId: class10A.id, name: 'Section Matric', code: 'G10-M', capacity: 30 },
    });

    // 5. Create Students in Grade 5
    student1 = await StudentService.createStudent(
      TENANT_A,
      {
        admissionSessionId: session2026A.id,
        classId: class5A.id,
        sectionId: section5A.id,
        admissionDate: '2026-04-01',
        firstNameEn: 'Bilal',
        lastNameEn: 'Ahmed',
        gender: 'MALE',
        dob: '2014-01-10',
        guardian: { fullNameEn: 'Ahmed Raza', primaryPhone: '0300-1111111', relationshipType: 'FATHER' },
      },
      'usr-admin'
    );

    student2 = await StudentService.createStudent(
      TENANT_A,
      {
        admissionSessionId: session2026A.id,
        classId: class5A.id,
        sectionId: section5A.id,
        admissionDate: '2026-04-01',
        firstNameEn: 'Danish',
        lastNameEn: 'Ali',
        gender: 'MALE',
        dob: '2014-02-15',
        guardian: { fullNameEn: 'Ali Hassan', primaryPhone: '0300-2222222', relationshipType: 'FATHER' },
      },
      'usr-admin'
    );

    student3 = await StudentService.createStudent(
      TENANT_A,
      {
        admissionSessionId: session2026A.id,
        classId: class5A.id,
        sectionId: section5A.id,
        admissionDate: '2026-04-01',
        firstNameEn: 'Eshal',
        lastNameEn: 'Fatima',
        gender: 'FEMALE',
        dob: '2014-03-20',
        guardian: { fullNameEn: 'Fatima Zahra', primaryPhone: '0300-3333333', relationshipType: 'MOTHER' },
      },
      'usr-admin'
    );

    // Create Withdrawn Student
    student4 = await StudentService.createStudent(
      TENANT_A,
      {
        admissionSessionId: session2026A.id,
        classId: class5A.id,
        sectionId: section5A.id,
        admissionDate: '2026-04-01',
        firstNameEn: 'Zainab',
        lastNameEn: 'Noor',
        gender: 'FEMALE',
        dob: '2014-04-25',
        guardian: { fullNameEn: 'Noor Muhammad', primaryPhone: '0300-4444444', relationshipType: 'FATHER' },
      },
      'usr-admin'
    );
    await prisma.student.update({
      where: { id: student4.id },
      data: { currentStatus: 'WITHDRAWN' },
    });

    // Create Grade 10 Final Class Student for Graduation
    studentGrad = await StudentService.createStudent(
      TENANT_A,
      {
        admissionSessionId: session2026A.id,
        classId: class10A.id,
        sectionId: section10A.id,
        admissionDate: '2026-04-01',
        firstNameEn: 'Usman',
        lastNameEn: 'Ghani',
        gender: 'MALE',
        dob: '2009-08-14',
        guardian: { fullNameEn: 'Ghani Khan', primaryPhone: '0300-5555555', relationshipType: 'FATHER' },
      },
      'usr-admin'
    );
  });

  afterEach(async () => {
    await prisma.promotionBatchItem.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.promotionBatch.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
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

  it('generates promotion preview with auto-suggestion and flags ineligible students', async () => {
    const preview = await PromotionService.getPromotionPreview(TENANT_A, {
      sourceSessionId: session2026A.id,
      sourceClassId: class5A.id,
      sourceSectionId: 'ALL',
      targetClassId: class6A.id,
    });

    expect(preview.isTerminalClass).toBe(false);
    expect(preview.suggestedTargetClass?.id).toBe(class6A.id);
    expect(preview.students.length).toBe(4);

    // Active students should be eligible and suggested PROMOTE
    const bilal = preview.students.find((s) => s.studentId === student1.id);
    expect(bilal?.isEligible).toBe(true);
    expect(bilal?.suggestedDecision).toBe('PROMOTE');

    // Withdrawn student should be flagged ineligible and suggested EXCLUDE
    const zainab = preview.students.find((s) => s.studentId === student4.id);
    expect(zainab?.isEligible).toBe(false);
    expect(zainab?.suggestedDecision).toBe('EXCLUDE');
  });

  it('executes mixed batch: whole-class promotion + one repeat + one hold without data loss', async () => {
    const batch = await PromotionService.processBulkPromotion(
      TENANT_A,
      {
        sourceSessionId: session2026A.id,
        targetSessionId: session2027A.id,
        sourceClassId: class5A.id,
        targetClassId: class6A.id,
        targetSectionId: section6A.id,
        isGraduation: false,
        studentDecisions: [
          { studentId: student1.id, decision: 'PROMOTE', targetSectionId: section6A.id, rollNumber: '01' },
          { studentId: student2.id, decision: 'REPEAT', targetSectionId: section5A.id, rollNumber: '99' },
          { studentId: student3.id, decision: 'HOLD', remarks: 'Fee clearance pending' },
          { studentId: student4.id, decision: 'EXCLUDE' },
        ],
      },
      'usr-admin'
    );

    expect(batch.batchNumber).toBeDefined();
    expect(batch.promotedCount).toBe(1);
    expect(batch.repeatedCount).toBe(1);
    expect(batch.heldCount).toBe(1);
    expect(batch.excludedCount).toBe(1);

    // 1. Check Promoted Student (Bilal)
    const bilalEnrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: student1.id, tenantId: TENANT_A },
      orderBy: { enrollmentDate: 'asc' },
    });
    expect(bilalEnrollments.length).toBe(2);
    // Old session closed
    expect(bilalEnrollments[0].academicSessionId).toBe(session2026A.id);
    expect(bilalEnrollments[0].status).toBe('PROMOTED');
    expect(bilalEnrollments[0].isCurrent).toBe(false);
    // New session active
    expect(bilalEnrollments[1].academicSessionId).toBe(session2027A.id);
    expect(bilalEnrollments[1].classId).toBe(class6A.id);
    expect(bilalEnrollments[1].status).toBe('ACTIVE');
    expect(bilalEnrollments[1].isCurrent).toBe(true);
    expect(bilalEnrollments[1].enrollmentType).toBe('PROMOTION');
    expect(bilalEnrollments[1].promotedFromEnrollmentId).toBe(bilalEnrollments[0].id);

    // 2. Check Repeated Student (Danish)
    const danishEnrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: student2.id, tenantId: TENANT_A },
      orderBy: { enrollmentDate: 'asc' },
    });
    expect(danishEnrollments.length).toBe(2);
    expect(danishEnrollments[0].status).toBe('REPEATED');
    expect(danishEnrollments[0].isCurrent).toBe(false);
    expect(danishEnrollments[1].academicSessionId).toBe(session2027A.id);
    expect(danishEnrollments[1].classId).toBe(class5A.id); // Same class
    expect(danishEnrollments[1].enrollmentType).toBe('REPEAT');
    expect(danishEnrollments[1].isCurrent).toBe(true);

    // 3. Check Held Student (Eshal)
    const eshalEnrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: student3.id, tenantId: TENANT_A },
    });
    expect(eshalEnrollments.length).toBe(1);
    expect(eshalEnrollments[0].isCurrent).toBe(true);
    expect(eshalEnrollments[0].status).toBe('ACTIVE');
  });

  it('processes final-class graduation and preserves complete historical transcripts', async () => {
    // Check final class preview
    const preview = await PromotionService.getPromotionPreview(TENANT_A, {
      sourceSessionId: session2026A.id,
      sourceClassId: class10A.id,
    });
    expect(preview.isTerminalClass).toBe(true);
    expect(preview.students[0].suggestedDecision).toBe('GRADUATE');

    // Process Graduation Batch
    const batch = await PromotionService.processBulkPromotion(
      TENANT_A,
      {
        sourceSessionId: session2026A.id,
        targetSessionId: session2026A.id,
        sourceClassId: class10A.id,
        isGraduation: true,
        studentDecisions: [
          { studentId: studentGrad.id, decision: 'GRADUATE', remarks: 'Passed Matric Examination' },
        ],
      },
      'usr-admin'
    );

    expect(batch.graduatedCount).toBe(1);

    // Check Student Status
    const gradStudent = await prisma.student.findUnique({
      where: { id: studentGrad.id },
      include: { enrollments: true, statusHistories: true },
    });
    expect(gradStudent?.currentStatus).toBe('GRADUATED');
    expect(gradStudent?.enrollments.length).toBe(1);
    expect(gradStudent?.enrollments[0].status).toBe('GRADUATED');
    expect(gradStudent?.enrollments[0].isCurrent).toBe(false);
    expect(gradStudent?.statusHistories.length).toBeGreaterThanOrEqual(1);
    const gradHistory = gradStudent?.statusHistories.find((h) => h.newStatus === 'GRADUATED');
    expect(gradHistory).toBeDefined();
    expect(gradHistory?.newStatus).toBe('GRADUATED');
  });

  it('performs safe transactional rollback of a promotion batch', async () => {
    // 1. Process Batch
    const batch = await PromotionService.processBulkPromotion(
      TENANT_A,
      {
        sourceSessionId: session2026A.id,
        targetSessionId: session2027A.id,
        sourceClassId: class5A.id,
        targetClassId: class6A.id,
        targetSectionId: section6A.id,
        studentDecisions: [
          { studentId: student1.id, decision: 'PROMOTE' },
          { studentId: student2.id, decision: 'REPEAT' },
        ],
      },
      'usr-admin'
    );

    // 2. Rollback Batch
    const rolledBack = await PromotionService.rollbackPromotionBatch(
      TENANT_A,
      batch.id,
      'Mistaken section placement',
      'usr-admin'
    );

    expect(rolledBack.isRolledBack).toBe(true);
    expect(rolledBack.rollbackReason).toBe('Mistaken section placement');

    // 3. Verify that new target enrollments were cleanly removed and source enrollments restored
    const bilalEnrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: student1.id, tenantId: TENANT_A },
    });
    expect(bilalEnrollments.length).toBe(1);
    expect(bilalEnrollments[0].academicSessionId).toBe(session2026A.id);
    expect(bilalEnrollments[0].status).toBe('ACTIVE');
    expect(bilalEnrollments[0].isCurrent).toBe(true);

    const danishEnrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: student2.id, tenantId: TENANT_A },
    });
    expect(danishEnrollments.length).toBe(1);
    expect(danishEnrollments[0].status).toBe('ACTIVE');
    expect(danishEnrollments[0].isCurrent).toBe(true);
  });

  it('enforces strict tenant isolation on bulk promotion batches', async () => {
    await expect(
      PromotionService.processBulkPromotion(
        TENANT_B,
        {
          sourceSessionId: session2026A.id,
          targetSessionId: session2027A.id,
          sourceClassId: class5A.id,
          studentDecisions: [{ studentId: student1.id, decision: 'PROMOTE' }],
        },
        'usr-admin-b'
      )
    ).rejects.toThrow();
  });
});
