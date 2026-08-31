import { prisma } from '../db/prisma';

export type PromotionDecision = 'PROMOTE' | 'REPEAT' | 'GRADUATE' | 'HOLD' | 'EXCLUDE';

export interface PromotionStudentItemDTO {
  studentId: string;
  decision: PromotionDecision;
  targetSectionId?: string;
  rollNumber?: string;
  remarks?: string;
}

export interface ProcessBulkPromotionDTO {
  sourceSessionId: string;
  targetSessionId: string;
  sourceClassId: string;
  sourceSectionId?: string;
  targetClassId?: string;
  targetSectionId?: string;
  isGraduation?: boolean;
  notes?: string;
  studentDecisions: PromotionStudentItemDTO[];
}

export class PromotionService {
  /**
   * Generates promotion preview list of eligible students from source class/section.
   */
  public static async getPromotionPreview(
    tenantId: string,
    params: {
      sourceSessionId: string;
      sourceClassId: string;
      sourceSectionId?: string;
      targetClassId?: string;
    }
  ) {
    const { sourceSessionId, sourceClassId, sourceSectionId, targetClassId } = params;

    // 1. Fetch Source Class & determine if it is the terminal/final class
    const allClasses = await prisma.schoolClass.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const sourceClass = allClasses.find((c) => c.id === sourceClassId);
    if (!sourceClass) throw new Error('Source class not found.');

    const highestClass = allClasses[allClasses.length - 1];
    const isTerminalClass = highestClass && highestClass.id === sourceClassId;

    // Determine target class auto-suggestion if not provided
    let suggestedTargetClass = null;
    if (!isTerminalClass) {
      const nextClassIndex = allClasses.findIndex((c) => c.id === sourceClassId) + 1;
      if (nextClassIndex < allClasses.length) {
        suggestedTargetClass = allClasses[nextClassIndex];
      }
    }

    // 2. Fetch Enrollments in Source Session/Class
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        tenantId,
        academicSessionId: sourceSessionId,
        classId: sourceClassId,
        ...(sourceSectionId && sourceSectionId !== 'ALL' ? { sectionId: sourceSectionId } : {}),
        isCurrent: true,
      },
      include: {
        student: {
          select: {
            id: true,
            admissionNo: true,
            firstNameEn: true,
            lastNameEn: true,
            fullNameUr: true,
            gender: true,
            currentStatus: true,
            category: { select: { id: true, name: true } },
          },
        },
        schoolClass: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true } },
      },
      orderBy: [
        { section: { name: 'asc' } },
        { rollNumber: 'asc' },
        { student: { firstNameEn: 'asc' } },
      ],
    });

    // 3. Map students with auto-suggestions & eligibility flags
    const previewList = enrollments.map((enr) => {
      const isEligible = enr.student.currentStatus === 'ACTIVE';
      let defaultDecision: PromotionDecision = 'PROMOTE';
      let ineligibleReason: string | undefined = undefined;

      if (!isEligible) {
        defaultDecision = 'EXCLUDE';
        ineligibleReason = `Student is currently '${enr.student.currentStatus}'. Not eligible for promotion.`;
      } else if (isTerminalClass || !targetClassId && !suggestedTargetClass) {
        defaultDecision = 'GRADUATE';
      }

      return {
        enrollmentId: enr.id,
        studentId: enr.student.id,
        admissionNo: enr.student.admissionNo,
        studentName: `${enr.student.firstNameEn} ${enr.student.lastNameEn || ''}`.trim(),
        studentNameUr: enr.student.fullNameUr,
        gender: enr.student.gender,
        currentStatus: enr.student.currentStatus,
        category: enr.student.category?.name,
        currentClassId: enr.classId,
        currentClassName: enr.schoolClass.name,
        currentSectionId: enr.sectionId,
        currentSectionName: enr.section.name,
        currentRollNumber: enr.rollNumber,
        isEligible,
        ineligibleReason,
        suggestedDecision: defaultDecision,
      };
    });

    return {
      isTerminalClass,
      suggestedTargetClass: suggestedTargetClass ? { id: suggestedTargetClass.id, name: suggestedTargetClass.name } : null,
      students: previewList,
      totalCount: previewList.length,
      eligibleCount: previewList.filter((s) => s.isEligible).length,
    };
  }

  /**
   * Executes atomic bulk promotion & graduation batch.
   */
  public static async processBulkPromotion(
    tenantId: string,
    data: ProcessBulkPromotionDTO,
    userId?: string
  ) {
    const {
      sourceSessionId,
      targetSessionId,
      sourceClassId,
      sourceSectionId,
      targetClassId,
      targetSectionId,
      isGraduation,
      notes,
      studentDecisions,
    } = data;

    if (!studentDecisions || studentDecisions.length === 0) {
      throw new Error('No students selected for promotion processing.');
    }

    // Tenant Scoping & Master Data Validation
    const sourceSession = await prisma.academicSession.findFirst({
      where: { id: sourceSessionId, tenantId },
    });
    if (!sourceSession) throw new Error('Source academic session not found in tenant.');

    const sourceClass = await prisma.schoolClass.findFirst({
      where: { id: sourceClassId, tenantId },
    });
    if (!sourceClass) throw new Error('Source class not found in tenant.');

    if (!isGraduation && targetSessionId) {
      const targetSession = await prisma.academicSession.findFirst({
        where: { id: targetSessionId, tenantId },
      });
      if (!targetSession) throw new Error('Target academic session not found in tenant.');
    }

    if (sourceSessionId === targetSessionId && !isGraduation) {
      throw new Error('Target academic session must be different from source session for promotion.');
    }

    // Foreign key safety on userId
    let validUserId: string | null = null;
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (userExists) validUserId = userExists.id;
    }

    // Generate batch number
    const batchCount = await prisma.promotionBatch.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    const batchNumber = `PROM-${year}-${String(batchCount + 1).padStart(3, '0')}`;

    // Counts
    let promotedCount = 0;
    let repeatedCount = 0;
    let graduatedCount = 0;
    let heldCount = 0;
    let excludedCount = 0;

    for (const d of studentDecisions) {
      if (d.decision === 'PROMOTE') promotedCount++;
      else if (d.decision === 'REPEAT') repeatedCount++;
      else if (d.decision === 'GRADUATE') graduatedCount++;
      else if (d.decision === 'HOLD') heldCount++;
      else if (d.decision === 'EXCLUDE') excludedCount++;
    }

    return prisma.$transaction(async (tx) => {
      // 1. Create Promotion Batch Record
      const batch = await tx.promotionBatch.create({
        data: {
          tenantId,
          batchNumber,
          sourceSessionId,
          targetSessionId,
          sourceClassId,
          sourceSectionId: sourceSectionId && sourceSectionId !== 'ALL' ? sourceSectionId : null,
          targetClassId: targetClassId || null,
          targetSectionId: targetSectionId && targetSectionId !== 'ALL' ? targetSectionId : null,
          isGraduation: !!isGraduation,
          totalStudents: studentDecisions.length,
          promotedCount,
          repeatedCount,
          graduatedCount,
          heldCount,
          excludedCount,
          processedByUserId: validUserId,
          notes,
        },
      });

      // 2. Process each student decision
      for (const item of studentDecisions) {
        const student = await tx.student.findFirst({
          where: { id: item.studentId, tenantId },
          include: {
            enrollments: {
              where: { academicSessionId: sourceSessionId, classId: sourceClassId },
              orderBy: { enrollmentDate: 'desc' },
            },
          },
        });

        if (!student) continue;
        const sourceEnrollment = student.enrollments[0];

        let targetEnrollmentId: string | null = null;
        let finalNewStatus = student.currentStatus;

        if (item.decision === 'PROMOTE') {
          if (!targetClassId) throw new Error('Target class is required for student promotion.');

          // Close source enrollment
          if (sourceEnrollment) {
            await tx.studentEnrollment.update({
              where: { id: sourceEnrollment.id },
              data: { status: 'PROMOTED', isCurrent: false },
            });
          }

          // Determine target section
          const finalSectionId = item.targetSectionId || targetSectionId || sourceEnrollment?.sectionId;
          if (!finalSectionId || finalSectionId === 'ALL') {
            // Pick default section of target class
            const defaultSection = await tx.section.findFirst({
              where: { tenantId, classId: targetClassId, isActive: true },
              orderBy: { sortOrder: 'asc' },
            });
            if (!defaultSection) throw new Error(`No sections found for target class.`);
          }

          const targetSection = item.targetSectionId || (targetSectionId && targetSectionId !== 'ALL' ? targetSectionId : null);
          const assignedSectionId = targetSection || (await tx.section.findFirst({
            where: { tenantId, classId: targetClassId, isActive: true },
            orderBy: { sortOrder: 'asc' },
          }))?.id;

          if (!assignedSectionId) throw new Error('No valid section available for target class.');

          // Create new enrollment in target session
          const newEnrollment = await tx.studentEnrollment.create({
            data: {
              tenantId,
              studentId: item.studentId,
              academicSessionId: targetSessionId,
              classId: targetClassId,
              sectionId: assignedSectionId,
              rollNumber: item.rollNumber || null,
              enrollmentType: 'PROMOTION',
              status: 'ACTIVE',
              isCurrent: true,
              promotedFromEnrollmentId: sourceEnrollment?.id || null,
              notes: item.remarks || `Promoted via Batch ${batchNumber}`,
            },
          });

          targetEnrollmentId = newEnrollment.id;
        } else if (item.decision === 'REPEAT') {
          // Close source enrollment as REPEATED
          if (sourceEnrollment) {
            await tx.studentEnrollment.update({
              where: { id: sourceEnrollment.id },
              data: { status: 'REPEATED', isCurrent: false },
            });
          }

          // Create repeat enrollment in same class in target session
          const assignedSectionId = item.targetSectionId || sourceEnrollment?.sectionId;
          if (!assignedSectionId) throw new Error('Section required for repeating class.');

          const repeatEnrollment = await tx.studentEnrollment.create({
            data: {
              tenantId,
              studentId: item.studentId,
              academicSessionId: targetSessionId,
              classId: sourceClassId,
              sectionId: assignedSectionId,
              rollNumber: item.rollNumber || null,
              enrollmentType: 'REPEAT',
              status: 'ACTIVE',
              isCurrent: true,
              promotedFromEnrollmentId: sourceEnrollment?.id || null,
              notes: item.remarks || `Repeating class in Session via Batch ${batchNumber}`,
            },
          });

          targetEnrollmentId = repeatEnrollment.id;
        } else if (item.decision === 'GRADUATE') {
          // Close source enrollment as GRADUATED
          if (sourceEnrollment) {
            await tx.studentEnrollment.update({
              where: { id: sourceEnrollment.id },
              data: { status: 'GRADUATED', isCurrent: false },
            });
          }

          // Update student status
          await tx.student.update({
            where: { id: item.studentId },
            data: { currentStatus: 'GRADUATED' },
          });
          finalNewStatus = 'GRADUATED';

          // Record Status History
          await tx.studentStatusHistory.create({
            data: {
              tenantId,
              studentId: item.studentId,
              previousStatus: student.currentStatus,
              newStatus: 'GRADUATED',
              reason: item.remarks || `Successfully completed final academic class via Batch ${batchNumber}`,
              effectiveDate: new Date(),
              changedByUserId: validUserId,
            },
          });
        }

        // 3. Create Promotion Batch Item
        await tx.promotionBatchItem.create({
          data: {
            tenantId,
            batchId: batch.id,
            studentId: item.studentId,
            decision: item.decision,
            sourceEnrollmentId: sourceEnrollment?.id || null,
            targetEnrollmentId,
            previousStudentStatus: student.currentStatus,
            newStudentStatus: finalNewStatus,
            targetClassId: item.decision === 'PROMOTE' ? targetClassId : item.decision === 'REPEAT' ? sourceClassId : null,
            targetSectionId: item.targetSectionId || null,
            remarks: item.remarks || null,
          },
        });
      }

      // 4. Central Audit Log
      if (validUserId) {
        await tx.auditLog.create({
          data: {
            tenantId,
            userId: validUserId,
            module: 'STUDENTS',
            entityType: 'PROMOTION_BATCH',
            entityId: batch.id,
            action: 'CREATE',
            changeSummary: `Executed Bulk Promotion Batch ${batchNumber}: Promoted ${promotedCount}, Repeated ${repeatedCount}, Graduated ${graduatedCount}, Held ${heldCount}, Excluded ${excludedCount}.`,
          },
        });
      }

      return batch;
    });
  }

  /**
   * Controlled safe rollback of an entire promotion batch.
   */
  public static async rollbackPromotionBatch(
    tenantId: string,
    batchId: string,
    reason: string,
    userId?: string
  ) {
    if (!reason || !reason.trim()) {
      throw new Error('A rollback reason is mandatory to revert a promotion batch.');
    }

    const batch = await prisma.promotionBatch.findFirst({
      where: { id: batchId, tenantId },
      include: { items: true },
    });

    if (!batch) throw new Error('Promotion batch not found.');
    if (batch.isRolledBack) throw new Error('This promotion batch has already been rolled back.');

    // Foreign key safety on userId
    let validUserId: string | null = null;
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (userExists) validUserId = userExists.id;
    }

    return prisma.$transaction(async (tx) => {
      for (const item of batch.items) {
        if (item.decision === 'PROMOTE' || item.decision === 'REPEAT') {
          // 1. Delete target enrollment created in this batch
          if (item.targetEnrollmentId) {
            await tx.studentEnrollment.delete({
              where: { id: item.targetEnrollmentId },
            });
          }

          // 2. Restore source enrollment
          if (item.sourceEnrollmentId) {
            await tx.studentEnrollment.update({
              where: { id: item.sourceEnrollmentId },
              data: { status: 'ACTIVE', isCurrent: true },
            });
          }
        } else if (item.decision === 'GRADUATE') {
          // 1. Restore Student status
          await tx.student.update({
            where: { id: item.studentId },
            data: { currentStatus: item.previousStudentStatus },
          });

          // 2. Restore source enrollment
          if (item.sourceEnrollmentId) {
            await tx.studentEnrollment.update({
              where: { id: item.sourceEnrollmentId },
              data: { status: 'ACTIVE', isCurrent: true },
            });
          }

          // 3. Record status history rollback note
          await tx.studentStatusHistory.create({
            data: {
              tenantId,
              studentId: item.studentId,
              previousStatus: 'GRADUATED',
              newStatus: item.previousStudentStatus,
              reason: `Rollback of Batch ${batch.batchNumber}: ${reason}`,
              effectiveDate: new Date(),
              changedByUserId: validUserId,
            },
          });
        }
      }

      // 3. Mark batch as rolled back
      const updatedBatch = await tx.promotionBatch.update({
        where: { id: batch.id },
        data: {
          isRolledBack: true,
          rolledBackAt: new Date(),
          rolledBackByUserId: validUserId,
          rollbackReason: reason.trim(),
        },
      });

      // 4. Central Audit Log
      if (validUserId) {
        await tx.auditLog.create({
          data: {
            tenantId,
            userId: validUserId,
            module: 'STUDENTS',
            entityType: 'PROMOTION_BATCH',
            entityId: batch.id,
            action: 'REVERSE',
            changeSummary: `Rolled back Promotion Batch ${batch.batchNumber}. Reason: ${reason}`,
          },
        });
      }

      return updatedBatch;
    });
  }

  /**
   * Retrieves list of all promotion batches with execution stats and rollback status.
   */
  public static async getPromotionBatches(tenantId: string) {
    return prisma.promotionBatch.findMany({
      where: { tenantId },
      include: {
        sourceSession: { select: { id: true, name: true, code: true } },
        targetSession: { select: { id: true, name: true, code: true } },
        sourceClass: { select: { id: true, name: true, code: true } },
        sourceSection: { select: { id: true, name: true, code: true } },
        targetClass: { select: { id: true, name: true, code: true } },
        targetSection: { select: { id: true, name: true, code: true } },
        processedBy: { select: { id: true, username: true } },
        rolledBackBy: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves details and item-by-item breakdown of a specific promotion batch.
   */
  public static async getPromotionBatchDetails(tenantId: string, batchId: string) {
    return prisma.promotionBatch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        sourceSession: { select: { id: true, name: true, code: true } },
        targetSession: { select: { id: true, name: true, code: true } },
        sourceClass: { select: { id: true, name: true, code: true } },
        sourceSection: { select: { id: true, name: true, code: true } },
        targetClass: { select: { id: true, name: true, code: true } },
        targetSection: { select: { id: true, name: true, code: true } },
        processedBy: { select: { id: true, username: true } },
        rolledBackBy: { select: { id: true, username: true } },
        items: {
          include: {
            student: {
              select: {
                id: true,
                admissionNo: true,
                firstNameEn: true,
                lastNameEn: true,
                fullNameUr: true,
                currentStatus: true,
              },
            },
          },
        },
      },
    });
  }
}
