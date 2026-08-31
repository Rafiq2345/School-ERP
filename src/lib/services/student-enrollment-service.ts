import { prisma } from '../db/prisma';

export class StudentEnrollmentService {
  /**
   * Promotes a student from one academic session/class to a new one, preserving historical records.
   */
  public static async promoteStudent(
    tenantId: string,
    studentId: string,
    data: {
      fromEnrollmentId: string;
      toSessionId: string;
      toClassId: string;
      toSectionId: string;
      rollNumber?: string;
      enrollmentType?: 'PROMOTION' | 'REPEAT' | 'TRANSFER_IN';
      notes?: string;
    },
    userId?: string
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Mark previous enrollment as COMPLETED/PROMOTED and not current
      const prev = await tx.studentEnrollment.update({
        where: { id: data.fromEnrollmentId },
        data: {
          isCurrent: false,
          status: data.enrollmentType === 'REPEAT' ? 'REPEATED' : 'PROMOTED',
        },
      });

      // 2. Create new enrollment
      const nextEnrollment = await tx.studentEnrollment.create({
        data: {
          tenantId,
          studentId,
          academicSessionId: data.toSessionId,
          classId: data.toClassId,
          sectionId: data.toSectionId,
          rollNumber: data.rollNumber || null,
          enrollmentType: data.enrollmentType || 'PROMOTION',
          status: 'ACTIVE',
          isCurrent: true,
          promotedFromEnrollmentId: prev.id,
          notes: data.notes || null,
        },
        include: { schoolClass: true, section: true, academicSession: true },
      });

      let validUserId: string | null = null;
      if (userId) {
        const userExists = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (userExists) validUserId = userExists.id;
      }

      // 3. Log status history
      await tx.studentStatusHistory.create({
        data: {
          tenantId,
          studentId,
          previousStatus: 'ACTIVE',
          newStatus: 'ACTIVE',
          reason: `Promoted to ${nextEnrollment.schoolClass.name} - ${nextEnrollment.section.name} for ${nextEnrollment.academicSession.name}`,
          changedByUserId: validUserId,
        },
      });

      return nextEnrollment;
    });
  }

  /**
   * Bulk reassign sections for a list of students within their current active enrollment.
   */
  public static async bulkAssignSection(
    tenantId: string,
    studentIds: string[],
    newSectionId: string,
    userId?: string
  ) {
    const section = await prisma.section.findFirst({
      where: { id: newSectionId, tenantId },
      include: { schoolClass: true },
    });
    if (!section) throw new Error('Target Section not found.');

    const updatedCount = await prisma.studentEnrollment.updateMany({
      where: {
        tenantId,
        studentId: { in: studentIds },
        isCurrent: true,
        classId: section.classId,
      },
      data: { sectionId: newSectionId },
    });

    if (userId) {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            module: 'STUDENTS',
            entityType: 'STUDENT_ENROLLMENT',
            entityId: newSectionId,
            action: 'UPDATE',
            changeSummary: `Bulk reassigned ${updatedCount.count} students to Section ${section.name} (${section.schoolClass.name})`,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return { success: true, count: updatedCount.count };
  }

  /**
   * Bulk update student categories.
   */
  public static async bulkUpdateCategory(
    tenantId: string,
    studentIds: string[],
    newCategoryId: string,
    userId?: string
  ) {
    const cat = await prisma.studentCategory.findFirst({
      where: { id: newCategoryId, tenantId },
    });
    if (!cat) throw new Error('Target Category not found.');

    const updated = await prisma.student.updateMany({
      where: { tenantId, id: { in: studentIds } },
      data: { categoryId: newCategoryId },
    });

    return { success: true, count: updated.count };
  }

  /**
   * Bulk update student houses.
   */
  public static async bulkUpdateHouse(
    tenantId: string,
    studentIds: string[],
    newHouseId: string,
    userId?: string
  ) {
    const house = await prisma.house.findFirst({
      where: { id: newHouseId, tenantId },
    });
    if (!house) throw new Error('Target House not found.');

    const updated = await prisma.student.updateMany({
      where: { tenantId, id: { in: studentIds } },
      data: { houseId: newHouseId },
    });

    return { success: true, count: updated.count };
  }
}
