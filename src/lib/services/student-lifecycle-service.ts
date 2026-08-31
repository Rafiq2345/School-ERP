import { prisma } from '../db/prisma';
import { StudentLifecycleStatus } from '../types/student-lifecycle';

export interface ChangeStatusDTO {
  newStatus: StudentLifecycleStatus;
  reason: string;
  effectiveDate?: string | Date;
  leavingCertificateNo?: string;
  leavingCertificateDate?: string | Date;
  remarks?: string;
}

export class StudentLifecycleService {
  /**
   * Transitions student lifecycle status (e.g. Active -> Withdrawn, Graduated, Suspended, Reactivated).
   * Enforces business rules, audit trails, and historical retention.
   */
  public static async changeStudentStatus(
    tenantId: string,
    studentId: string,
    data: ChangeStatusDTO,
    userId?: string
  ) {
    if (!data.reason || !data.reason.trim()) {
      throw new Error('A valid reason is required to perform a student lifecycle action.');
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId },
    });
    if (!student) throw new Error('Student record not found.');

    if (student.currentStatus === data.newStatus) {
      throw new Error(`Student is already in '${data.newStatus}' status.`);
    }

    const previousStatus = student.currentStatus;
    const effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : new Date();

    return prisma.$transaction(async (tx) => {
      // 1. Update Student Current Status
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: { currentStatus: data.newStatus },
      });

      // 2. Manage Enrollment Records without deleting history
      if (['WITHDRAWN', 'TRANSFERRED', 'GRADUATED', 'LEFT'].includes(data.newStatus)) {
        // Mark current enrollment as non-current and update enrollment status
        await tx.studentEnrollment.updateMany({
          where: { studentId, tenantId, isCurrent: true },
          data: { status: data.newStatus, isCurrent: false },
        });
      } else if (data.newStatus === 'ACTIVE') {
        // Re-activation: restore latest enrollment to ACTIVE and isCurrent: true if no active enrollment exists
        const latestEnrollment = await tx.studentEnrollment.findFirst({
          where: { studentId, tenantId },
          orderBy: { enrollmentDate: 'desc' },
        });

        if (latestEnrollment) {
          await tx.studentEnrollment.update({
            where: { id: latestEnrollment.id },
            data: { status: 'ACTIVE', isCurrent: true },
          });
        }
      }

      // Foreign key safety on userId
      let validUserId: string | null = null;
      if (userId) {
        const userExists = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (userExists) validUserId = userExists.id;
      }

      // 3. Create Immutable Status History Record
      const history = await tx.studentStatusHistory.create({
        data: {
          tenantId,
          studentId,
          previousStatus,
          newStatus: data.newStatus,
          reason: data.reason.trim(),
          effectiveDate,
          leavingCertificateNo: data.leavingCertificateNo ? data.leavingCertificateNo.trim() : null,
          leavingCertificateDate: data.leavingCertificateDate ? new Date(data.leavingCertificateDate) : null,
          remarks: data.remarks ? data.remarks.trim() : null,
          changedByUserId: validUserId,
        },
      });

      // 4. Record Central Audit Log
      if (userId) {
        await tx.auditLog.create({
          data: {
            tenantId,
            userId,
            module: 'STUDENTS',
            entityType: 'STUDENT',
            entityId: studentId,
            action: 'UPDATE',
            changeSummary: `Executed lifecycle status change for student ${student.firstNameEn} (${student.admissionNo}): ${previousStatus} -> ${data.newStatus}. Reason: ${data.reason}`,
            oldValues: { status: previousStatus },
            newValues: {
              status: data.newStatus,
              reason: data.reason,
              effectiveDate: effectiveDate.toISOString(),
              leavingCertificateNo: data.leavingCertificateNo,
            },
          },
        });
      }

      return { student: updatedStudent, history };
    });
  }

  /**
   * Retrieves full lifecycle history timeline for a student.
   */
  public static async getStudentStatusHistory(tenantId: string, studentId: string) {
    return prisma.studentStatusHistory.findMany({
      where: { tenantId, studentId },
      include: { changedBy: { select: { id: true, username: true } } },
      orderBy: { effectiveDate: 'desc' },
    });
  }
}
