import { HolidayService } from './holiday-service';
import { prisma } from '@/lib/db/prisma';
import {
  AttendanceDashboardStats,
  AttendanceStatus,
  ClassSectionAttendanceSummary,
  SaveDailyAttendanceDTO,
  StudentRosterForAttendance,
} from '@/lib/types/attendance';

export class AttendanceService {
  /**
   * Normalize any input date to UTC midnight for single-date equality matching in PostgreSQL.
   */
  public static normalizeDate(dateInput: string | Date): Date {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput.getTime());
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  }

  /**
   * Retrieves today's overall school attendance dashboard metrics and section-by-section breakdown.
   */
  public static async getTodayAttendanceDashboard(
    tenantId: string,
    dateInput?: string | Date,
    sessionId?: string
  ): Promise<AttendanceDashboardStats> {
    const date = this.normalizeDate(dateInput || new Date());

    // 1. Resolve academic session
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const activeSession = await prisma.academicSession.findFirst({
        where: { tenantId, isCurrent: true },
        select: { id: true },
      });
      targetSessionId = activeSession?.id;
    }

    // 2. Fetch all active classes & sections for this tenant
    const classes = await prisma.schoolClass.findMany({
      where: { tenantId, isActive: true },
      include: {
        sections: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 3. Fetch active enrollments count grouped by section
    const enrollmentWhere: any = {
      tenantId,
      isCurrent: true,
      status: 'ACTIVE',
    };
    if (targetSessionId) {
      enrollmentWhere.academicSessionId = targetSessionId;
    }

    const activeEnrollments = await prisma.studentEnrollment.findMany({
      where: enrollmentWhere,
      select: {
        id: true,
        classId: true,
        sectionId: true,
        studentId: true,
      },
    });

    const totalEnrolledStudents = activeEnrollments.length;

    // 4. Fetch attendance records for this date
    const attendanceRecords = await prisma.studentAttendanceRecord.findMany({
      where: {
        tenantId,
        attendanceDate: date,
        ...(targetSessionId ? { academicSessionId: targetSessionId } : {}),
      },
      include: {
        recordedBy: { select: { username: true } },
      },
    });

    // Compute overall tallies
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalLeave = 0;

    const attendanceMapBySection: Record<string, typeof attendanceRecords> = {};
    for (const record of attendanceRecords) {
      if (!attendanceMapBySection[record.sectionId]) {
        attendanceMapBySection[record.sectionId] = [];
      }
      attendanceMapBySection[record.sectionId].push(record);

      if (record.status === 'PRESENT') totalPresent++;
      else if (record.status === 'ABSENT') totalAbsent++;
      else if (record.status === 'LATE') totalLate++;
      else if (record.status === 'LEAVE' || record.status === 'HALF_DAY' || record.status === 'EXCUSED') totalLeave++;
    }

    const totalMarked = totalPresent + totalAbsent + totalLate + totalLeave;
    const totalUnmarked = Math.max(0, totalEnrolledStudents - totalMarked);
    const overallRate = totalMarked > 0 ? Number(((totalPresent + totalLate) / totalMarked * 100).toFixed(1)) : 0;

    // 5. Build Class/Section breakdown
    const classBreakdown: ClassSectionAttendanceSummary[] = [];

    for (const cls of classes) {
      for (const sec of cls.sections) {
        const enrolledInSection = activeEnrollments.filter(
          (e) => e.classId === cls.id && e.sectionId === sec.id
        ).length;

        const secRecords = attendanceMapBySection[sec.id] || [];
        let p = 0;
        let a = 0;
        let l = 0;
        let lv = 0;

        for (const r of secRecords) {
          if (r.status === 'PRESENT') p++;
          else if (r.status === 'ABSENT') a++;
          else if (r.status === 'LATE') l++;
          else if (r.status === 'LEAVE' || r.status === 'HALF_DAY' || r.status === 'EXCUSED') lv++;
        }

        const marked = p + a + l + lv;
        const unmarked = Math.max(0, enrolledInSection - marked);
        const rate = marked > 0 ? Number(((p + l) / marked * 100).toFixed(1)) : 0;
        const isMarked = enrolledInSection > 0 && marked >= enrolledInSection;

        const latestRecord = secRecords[0];

        classBreakdown.push({
          classId: cls.id,
          className: cls.name,
          sectionId: sec.id,
          sectionName: sec.name,
          totalEnrolled: enrolledInSection,
          markedCount: marked,
          presentCount: p,
          absentCount: a,
          lateCount: l,
          leaveCount: lv,
          unmarkedCount: unmarked,
          attendanceRate: rate,
          isMarked,
          markedAt: latestRecord?.createdAt,
          markedBy: latestRecord?.recordedBy?.username,
        });
      }
    }

    const todayHoliday = await HolidayService.isDateHoliday(tenantId, date, { sessionId: targetSessionId });

    return {
      date: date.toISOString().split('T')[0],
      totalEnrolled: totalEnrolledStudents,
      presentCount: totalPresent,
      absentCount: totalAbsent,
      lateCount: totalLate,
      leaveCount: totalLeave,
      unmarkedCount: totalUnmarked,
      attendancePercentage: overallRate,
      isTodayHoliday: todayHoliday.isHoliday,
      todayHolidayTitle: todayHoliday.holidayInfo?.title,
      classBreakdown,
    };
  }

  /**
   * Retrieves the active student roster for a specific Class & Section on a specific date,
   * including any existing attendance records.
   */
  public static async getClassRosterForAttendance(
    tenantId: string,
    params: {
      sessionId?: string;
      classId: string;
      sectionId: string;
      date: string | Date;
    }
  ): Promise<{
    roster: StudentRosterForAttendance[];
    isAlreadyMarked: boolean;
    isHoliday?: boolean;
    isWeeklyOff?: boolean;
    holidayInfo?: any;
    classInfo: { name: string; sectionName: string };
  }> {
    const { classId, sectionId } = params;
    const date = this.normalizeDate(params.date);

    // 1. Resolve session
    let sessionId = params.sessionId;
    if (!sessionId) {
      const activeSession = await prisma.academicSession.findFirst({
        where: { tenantId, isCurrent: true },
        select: { id: true },
      });
      sessionId = activeSession?.id;
    }

    // 2. Fetch class & section info
    const [cls, sec] = await Promise.all([
      prisma.schoolClass.findFirst({ where: { id: classId, tenantId } }),
      prisma.section.findFirst({ where: { id: sectionId, tenantId, classId } }),
    ]);

    if (!cls || !sec) {
      throw new Error('Selected class or section not found in tenant.');
    }

    // 3. Fetch active enrollments
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        tenantId,
        classId,
        sectionId,
        isCurrent: true,
        status: 'ACTIVE',
        ...(sessionId ? { academicSessionId: sessionId } : {}),
      },
      include: {
        student: true,
      },
      orderBy: [
        { rollNumber: 'asc' },
        { student: { firstNameEn: 'asc' } },
      ],
    });

    // 4. Fetch existing attendance records on this date
    const existingRecords = await prisma.studentAttendanceRecord.findMany({
      where: {
        tenantId,
        classId,
        sectionId,
        attendanceDate: date,
        ...(sessionId ? { academicSessionId: sessionId } : {}),
      },
      include: {
        recordedBy: { select: { username: true } },
      },
    });

    const recordMap = new Map<string, (typeof existingRecords)[0]>();
    for (const rec of existingRecords) {
      recordMap.set(rec.studentId, rec);
    }

    const roster: StudentRosterForAttendance[] = enrollments.map((enr) => {
      const existing = recordMap.get(enr.studentId);
      return {
        studentId: enr.studentId,
        enrollmentId: enr.id,
        admissionNo: enr.student.admissionNo,
        rollNumber: enr.rollNumber,
        nameEn: `${enr.student.firstNameEn} ${enr.student.lastNameEn || ''}`.trim(),
        fullNameUr: enr.student.fullNameUr,
        gender: enr.student.gender,
        photoUrl: enr.student.photoUrl,
        existingAttendance: existing
          ? {
              id: existing.id,
              status: existing.status as AttendanceStatus,
              remarks: existing.remarks,
              markedAt: existing.updatedAt || existing.createdAt,
              recordedBy: existing.recordedBy?.username,
            }
          : null,
      };
    });

    const isAlreadyMarked = existingRecords.length > 0 && existingRecords.length >= enrollments.length;
    const holidayCheck = await HolidayService.isDateHoliday(tenantId, date, { classId, sessionId });

    return {
      roster,
      isAlreadyMarked,
      isHoliday: holidayCheck.isHoliday,
      isWeeklyOff: holidayCheck.isWeeklyOff,
      holidayInfo: holidayCheck.holidayInfo,
      classInfo: { name: cls.name, sectionName: sec.name },
    };
  }

  /**
   * Atomically saves or updates daily attendance records and creates immutable audit logs upon corrections.
   */
  public static async saveDailyAttendance(
    tenantId: string,
    data: SaveDailyAttendanceDTO,
    userId?: string
  ) {
    const { sessionId, classId, sectionId, records, correctionReason } = data;
    const date = this.normalizeDate(data.date);

    if (!records || records.length === 0) {
      throw new Error('No student attendance records provided.');
    }

    // Validate foreign keys in tenant
    const [sess, cls, sec] = await Promise.all([
      prisma.academicSession.findFirst({ where: { id: sessionId, tenantId } }),
      prisma.schoolClass.findFirst({ where: { id: classId, tenantId } }),
      prisma.section.findFirst({ where: { id: sectionId, tenantId, classId } }),
    ]);

    if (!sess || !cls || !sec) {
      throw new Error('Invalid academic session, class, or section specified.');
    }

    // Block standard attendance marking on configured non-working days/holidays unless explicit override
    const holidayCheck = await HolidayService.isDateHoliday(tenantId, date, { classId, sessionId });
    if (holidayCheck.isHoliday && !data.allowHolidayOverride) {
      const reason = holidayCheck.holidayInfo?.title || (holidayCheck.isWeeklyOff ? 'Weekly Off' : 'School Holiday');
      throw new Error(`Cannot mark standard attendance on a configured non-working day / holiday: "${reason}".`);
    }

    // Foreign key safety on userId
    let validUserId: string | null = null;
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (userExists) validUserId = userExists.id;
    }

    return prisma.$transaction(async (tx) => {
      let createdCount = 0;
      let updatedCount = 0;
      let auditCount = 0;

      for (const item of records) {
        // Check existing record
        const existing = await tx.studentAttendanceRecord.findUnique({
          where: {
            tenantId_studentId_attendanceDate: {
              tenantId,
              studentId: item.studentId,
              attendanceDate: date,
            },
          },
        });

        if (existing) {
          // If status or remarks changed, update and log correction audit
          if (existing.status !== item.status || existing.remarks !== (item.remarks || null)) {
            const updated = await tx.studentAttendanceRecord.update({
              where: { id: existing.id },
              data: {
                status: item.status,
                remarks: item.remarks || null,
                recordedByUserId: validUserId || existing.recordedByUserId,
                classId,
                sectionId,
                academicSessionId: sessionId,
              },
            });

            // Log immutable correction audit
            await tx.attendanceAuditLog.create({
              data: {
                tenantId,
                attendanceRecordId: updated.id,
                studentId: item.studentId,
                attendanceDate: date,
                previousStatus: existing.status,
                newStatus: item.status,
                previousRemarks: existing.remarks,
                newRemarks: item.remarks || null,
                correctionReason: correctionReason || 'Attendance status corrected by user',
                correctedByUserId: validUserId,
              },
            });

            updatedCount++;
            auditCount++;
          }
        } else {
          // Insert new record
          await tx.studentAttendanceRecord.create({
            data: {
              tenantId,
              studentId: item.studentId,
              enrollmentId: item.enrollmentId,
              academicSessionId: sessionId,
              classId,
              sectionId,
              attendanceDate: date,
              status: item.status,
              remarks: item.remarks || null,
              recordedByUserId: validUserId,
            },
          });
          createdCount++;
        }
      }

      // Record to platform AuditLog
      if (validUserId) {
        try {
          await tx.auditLog.create({
            data: {
              tenantId,
              userId: validUserId,
              module: 'ATTENDANCE',
              action: updatedCount > 0 ? 'CORRECT' : 'CREATE',
              entityType: 'ATTENDANCE_RECORD',
              entityId: `${cls.code}-${sec.code}-${date.toISOString().split('T')[0]}`,
              newValues: {
                class: cls.name,
                section: sec.name,
                date: date.toISOString().split('T')[0],
                createdCount,
                updatedCount,
                totalSubmitted: records.length,
              },
              changeSummary: `Recorded attendance for ${cls.name} - ${sec.name} (${records.length} students)`,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      return {
        success: true,
        date: date.toISOString().split('T')[0],
        createdCount,
        updatedCount,
        auditCount,
        totalSubmitted: records.length,
      };
    });
  }

  /**
   * Generates a tabular matrix of students vs dates for a specific Class & Section.
   */
  public static async getAttendanceRegister(
    tenantId: string,
    params: {
      sessionId?: string;
      classId: string;
      sectionId: string;
      startDate: string | Date;
      endDate: string | Date;
      studentId?: string;
    }
  ) {
    const { classId, sectionId, studentId } = params;
    const start = this.normalizeDate(params.startDate);
    const end = this.normalizeDate(params.endDate);

    // 1. Fetch active enrollments in class/section
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        tenantId,
        classId,
        sectionId,
        ...(studentId ? { studentId } : {}),
        isCurrent: true,
      },
      include: {
        student: true,
      },
      orderBy: [
        { rollNumber: 'asc' },
        { student: { firstNameEn: 'asc' } },
      ],
    });

    // 2. Fetch all attendance records within date range
    const records = await prisma.studentAttendanceRecord.findMany({
      where: {
        tenantId,
        classId,
        sectionId,
        ...(studentId ? { studentId } : {}),
        attendanceDate: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { attendanceDate: 'asc' },
    });

    // 3. Generate list of dates in range
    const dates: string[] = [];
    const curr = new Date(start.getTime());
    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    // 4. Build student matrix
    const matrix = enrollments.map((enr) => {
      const studentRecords = records.filter((r) => r.studentId === enr.studentId);
      const recordByDate = new Map<string, string>();
      for (const r of studentRecords) {
        const dStr = r.attendanceDate.toISOString().split('T')[0];
        recordByDate.set(dStr, r.status);
      }

      let p = 0;
      let a = 0;
      let l = 0;
      let lv = 0;

      const dailyStatus: Record<string, string> = {};
      for (const dStr of dates) {
        const st = recordByDate.get(dStr) || '-';
        dailyStatus[dStr] = st;

        if (st === 'PRESENT') p++;
        else if (st === 'ABSENT') a++;
        else if (st === 'LATE') l++;
        else if (st === 'LEAVE' || st === 'HALF_DAY' || st === 'EXCUSED') lv++;
      }

      const totalMarkedDays = p + a + l + lv;
      const rate = totalMarkedDays > 0 ? Number(((p + l) / totalMarkedDays * 100).toFixed(1)) : 0;

      return {
        studentId: enr.studentId,
        admissionNo: enr.student.admissionNo,
        rollNumber: enr.rollNumber,
        nameEn: `${enr.student.firstNameEn} ${enr.student.lastNameEn || ''}`.trim(),
        dailyStatus,
        summary: {
          present: p,
          absent: a,
          late: l,
          leave: lv,
          totalMarkedDays,
          attendanceRate: rate,
        },
      };
    });

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      dates,
      matrix,
    };
  }

  /**
   * Retrieves immutable correction audit log entries.
   */
  public static async getAttendanceAuditLogs(
    tenantId: string,
    filters?: {
      studentId?: string;
      startDate?: string | Date;
      endDate?: string | Date;
      limit?: number;
    }
  ) {
    const where: any = { tenantId };

    if (filters?.studentId) where.studentId = filters.studentId;
    if (filters?.startDate || filters?.endDate) {
      where.attendanceDate = {
        ...(filters.startDate ? { gte: this.normalizeDate(filters.startDate) } : {}),
        ...(filters.endDate ? { lte: this.normalizeDate(filters.endDate) } : {}),
      };
    }

    return prisma.attendanceAuditLog.findMany({
      where,
      include: {
        student: { select: { admissionNo: true, firstNameEn: true, lastNameEn: true } },
        correctedBy: { select: { username: true, userType: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }

  /**
   * Retrieves a single student's attendance summary and recent record logs for Student Profile 360°.
   */
  public static async getStudentAttendanceSummary(
    tenantId: string,
    studentId: string,
    sessionId?: string
  ) {
    const records = await prisma.studentAttendanceRecord.findMany({
      where: {
        tenantId,
        studentId,
        ...(sessionId ? { academicSessionId: sessionId } : {}),
      },
      include: {
        schoolClass: { select: { name: true } },
        section: { select: { name: true } },
        recordedBy: { select: { username: true } },
      },
      orderBy: { attendanceDate: 'desc' },
    });

    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    for (const r of records) {
      if (r.status === 'PRESENT') present++;
      else if (r.status === 'ABSENT') absent++;
      else if (r.status === 'LATE') late++;
      else if (r.status === 'LEAVE' || r.status === 'HALF_DAY' || r.status === 'EXCUSED') leave++;
    }

    const totalWorkingDays = records.length;
    const attendanceRate = totalWorkingDays > 0
      ? Number(((present + late) / totalWorkingDays * 100).toFixed(1))
      : 0;

    return {
      studentId,
      totalWorkingDays,
      presentDays: present,
      absentDays: absent,
      lateDays: late,
      leaveDays: leave,
      attendanceRate,
      recentRecords: records.slice(0, 30).map((r) => ({
        id: r.id,
        date: r.attendanceDate.toISOString().split('T')[0],
        status: r.status as AttendanceStatus,
        remarks: r.remarks,
        className: r.schoolClass.name,
        sectionName: r.section.name,
        recordedBy: r.recordedBy?.username || 'Teacher',
        markedAt: r.updatedAt || r.createdAt,
      })),
    };
  }
}
