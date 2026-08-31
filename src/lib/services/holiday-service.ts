import { prisma } from '@/lib/db/prisma';
import {
  SchoolHolidayDTO,
  CreateHolidayDTO,
  UpdateHolidayDTO,
  WeeklyOffSettingDTO,
  HolidayConflictCheckResult,
  WorkingDaysCalculationResult,
  DateWorkingStatus,
  HolidayType,
  HolidayScope,
  HolidayStatus,
} from '@/lib/types/holiday';

export class HolidayService {
  /**
   * Normalizes any Date or YYYY-MM-DD string to UTC midnight Date.
   */
  public static normalizeDate(input: string | Date): Date {
    if (typeof input === 'string') {
      const parts = input.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0));
      }
    }
    const d = new Date(input);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }

  /**
   * Formats a Date object to YYYY-MM-DD.
   */
  public static formatDateString(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  /**
   * Retrieves Weekly Off configuration (defaults to Sunday [0] if unconfigured).
   */
  public static async getWeeklyOffSetting(
    tenantId: string,
    sessionId?: string | null
  ): Promise<WeeklyOffSettingDTO> {
    const setting = await prisma.weeklyOffSetting.findFirst({
      where: {
        tenantId,
        ...(sessionId ? { academicSessionId: sessionId } : {}),
        isActive: true,
      },
    });

    const dayNamesMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysOfWeek = setting?.daysOfWeek && setting.daysOfWeek.length > 0 ? setting.daysOfWeek : [0];

    return {
      id: setting?.id,
      academicSessionId: setting?.academicSessionId || null,
      daysOfWeek,
      isActive: setting?.isActive ?? true,
      description: setting?.description || 'Standard Weekly Off Schedule',
      dayNames: daysOfWeek.map((day) => dayNamesMap[day]),
      updatedAt: setting?.updatedAt?.toISOString(),
    };
  }

  /**
   * Updates or creates Weekly Off setting for tenant/session.
   */
  public static async updateWeeklyOffSetting(
    tenantId: string,
    data: { daysOfWeek: number[]; academicSessionId?: string | null; description?: string },
    userId?: string
  ): Promise<WeeklyOffSettingDTO> {
    if (!data.daysOfWeek || data.daysOfWeek.length === 0) {
      throw new Error('At least one weekly off day must be selected.');
    }

    const previous = await prisma.weeklyOffSetting.findFirst({
      where: {
        tenantId,
        academicSessionId: data.academicSessionId || null,
      },
    });

    let validUserId: string | null = null;
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (userExists) validUserId = userExists.id;
    }

    const saved = await prisma.$transaction(async (tx) => {
      let record;
      if (previous) {
        record = await tx.weeklyOffSetting.update({
          where: { id: previous.id },
          data: {
            daysOfWeek: data.daysOfWeek,
            description: data.description || previous.description,
            updatedByUserId: validUserId,
            isActive: true,
          },
        });
      } else {
        record = await tx.weeklyOffSetting.create({
          data: {
            tenantId,
            academicSessionId: data.academicSessionId || null,
            daysOfWeek: data.daysOfWeek,
            description: data.description || 'Weekly Off Schedule',
            updatedByUserId: validUserId,
            isActive: true,
          },
        });
      }

      // Log audit
      await tx.holidayAuditLog.create({
        data: {
          tenantId,
          action: 'WEEKLY_OFF_UPDATED',
          previousState: previous ? { daysOfWeek: previous.daysOfWeek, description: previous.description } : undefined,
          newState: { daysOfWeek: data.daysOfWeek, description: data.description },
          reason: 'Weekly non-working days updated',
          userId: validUserId,
        },
      });

      return record;
    });

    const dayNamesMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      id: saved.id,
      academicSessionId: saved.academicSessionId,
      daysOfWeek: saved.daysOfWeek,
      isActive: saved.isActive,
      description: saved.description,
      dayNames: saved.daysOfWeek.map((day) => dayNamesMap[day]),
      updatedAt: saved.updatedAt.toISOString(),
    };
  }

  /**
   * Checks if attendance records already exist on dates within the proposed holiday range.
   */
  public static async checkExistingAttendanceConflict(
    tenantId: string,
    startDate: string | Date,
    endDate: string | Date,
    options?: { classIds?: string[]; sessionId?: string }
  ): Promise<HolidayConflictCheckResult> {
    const start = this.normalizeDate(startDate);
    const end = this.normalizeDate(endDate);

    const existingRecords = await prisma.studentAttendanceRecord.findMany({
      where: {
        tenantId,
        attendanceDate: { gte: start, lte: end },
        ...(options?.classIds && options.classIds.length > 0 ? { classId: { in: options.classIds } } : {}),
        ...(options?.sessionId ? { academicSessionId: options.sessionId } : {}),
      },
      include: {
        schoolClass: { select: { id: true, name: true } },
      },
    });

    if (existingRecords.length === 0) {
      return {
        hasConflict: false,
        totalRecordsFound: 0,
        conflictsByDate: [],
      };
    }

    // Group by Date and Class
    const dateMap: Record<string, Record<string, { className: string; count: number; sections: Set<string> }>> = {};

    for (const record of existingRecords) {
      const dateStr = this.formatDateString(record.attendanceDate);
      if (!dateMap[dateStr]) dateMap[dateStr] = {};

      const cId = record.classId;
      const cName = record.schoolClass.name;
      if (!dateMap[dateStr][cId]) {
        dateMap[dateStr][cId] = { className: cName, count: 0, sections: new Set() };
      }
      dateMap[dateStr][cId].count++;
      dateMap[dateStr][cId].sections.add(record.sectionId);
    }

    const conflictsByDate = Object.keys(dateMap).map((date) => ({
      date,
      attendanceCount: Object.values(dateMap[date]).reduce((sum, c) => sum + c.count, 0),
      classesAffected: Object.keys(dateMap[date]).map((cId) => ({
        classId: cId,
        className: dateMap[date][cId].className,
        sectionCount: dateMap[date][cId].sections.size,
        studentCount: dateMap[date][cId].count,
      })),
    }));

    return {
      hasConflict: true,
      totalRecordsFound: existingRecords.length,
      conflictsByDate,
    };
  }

  /**
   * Creates a new School Holiday / Vacation period with strict audit & conflict controls.
   */
  public static async createHoliday(
    tenantId: string,
    data: CreateHolidayDTO,
    userId?: string
  ): Promise<{ holiday: SchoolHolidayDTO; conflictResult?: HolidayConflictCheckResult }> {
    if (!data.title || !data.title.trim()) {
      throw new Error('Holiday Title / Reason is mandatory.');
    }
    if (!data.startDate || !data.endDate) {
      throw new Error('Start Date and End Date are mandatory.');
    }

    const start = this.normalizeDate(data.startDate);
    const end = this.normalizeDate(data.endDate);

    if (end < start) {
      throw new Error('End Date cannot be before Start Date.');
    }

    // Check attendance conflicts
    const conflictResult = await this.checkExistingAttendanceConflict(tenantId, start, end, {
      classIds: data.targetClassIds,
      sessionId: data.academicSessionId,
    });

    if (conflictResult.hasConflict && !data.allowConflictOverride) {
      return {
        holiday: null as any,
        conflictResult,
      };
    }

    let validUserId: string | null = null;
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (userExists) validUserId = userExists.id;
    }

    const created = await prisma.$transaction(async (tx) => {
      const record = await tx.schoolHoliday.create({
        data: {
          tenantId,
          title: data.title.trim(),
          holidayType: data.holidayType || 'PUBLIC_HOLIDAY',
          startDate: start,
          endDate: end,
          scope: data.scope || 'WHOLE_SCHOOL',
          academicSessionId: data.academicSessionId || null,
          targetClassIds: data.targetClassIds || [],
          description: data.description || null,
          status: 'ACTIVE',
          createdByUserId: validUserId,
          updatedByUserId: validUserId,
        },
        include: {
          academicSession: { select: { id: true, name: true } },
          createdBy: { select: { id: true, username: true } },
        },
      });

      // Immutable Audit Log
      await tx.holidayAuditLog.create({
        data: {
          tenantId,
          holidayId: record.id,
          action: conflictResult.hasConflict ? 'ATTENDANCE_OVERRIDE' : 'CREATED',
          newState: {
            title: record.title,
            holidayType: record.holidayType,
            startDate: this.formatDateString(record.startDate),
            endDate: this.formatDateString(record.endDate),
            scope: record.scope,
            targetClassIds: record.targetClassIds,
            academicSessionId: record.academicSessionId,
          },
          reason: conflictResult.hasConflict
            ? `Created with override over ${conflictResult.totalRecordsFound} existing attendance records`
            : 'School holiday registered',
          userId: validUserId,
        },
      });

      return record;
    });

    return {
      holiday: this.mapHolidayToDTO(created),
    };
  }

  /**
   * Updates an existing holiday and writes audit trail.
   */
  public static async updateHoliday(
    tenantId: string,
    id: string,
    data: UpdateHolidayDTO,
    userId?: string
  ): Promise<SchoolHolidayDTO> {
    if (!data.editReason || !data.editReason.trim()) {
      throw new Error('Edit Reason / Justification is mandatory.');
    }

    const existing = await prisma.schoolHoliday.findFirst({
      where: { id, tenantId },
      include: { academicSession: true, createdBy: true },
    });

    if (!existing) {
      throw new Error('Holiday record not found in tenant.');
    }

    let validUserId: string | null = null;
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (userExists) validUserId = userExists.id;
    }

    const start = data.startDate ? this.normalizeDate(data.startDate) : existing.startDate;
    const end = data.endDate ? this.normalizeDate(data.endDate) : existing.endDate;

    if (end < start) {
      throw new Error('End Date cannot be before Start Date.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.schoolHoliday.update({
        where: { id: existing.id },
        data: {
          title: data.title ? data.title.trim() : existing.title,
          holidayType: data.holidayType || existing.holidayType,
          startDate: start,
          endDate: end,
          scope: data.scope || existing.scope,
          academicSessionId: data.academicSessionId !== undefined ? data.academicSessionId : existing.academicSessionId,
          targetClassIds: data.targetClassIds !== undefined ? data.targetClassIds : existing.targetClassIds,
          description: data.description !== undefined ? data.description : existing.description,
          updatedByUserId: validUserId,
        },
        include: {
          academicSession: { select: { id: true, name: true } },
          createdBy: { select: { id: true, username: true } },
        },
      });

      // Audit Log
      await tx.holidayAuditLog.create({
        data: {
          tenantId,
          holidayId: record.id,
          action: 'UPDATED',
          previousState: {
            title: existing.title,
            holidayType: existing.holidayType,
            startDate: this.formatDateString(existing.startDate),
            endDate: this.formatDateString(existing.endDate),
            scope: existing.scope,
            targetClassIds: existing.targetClassIds,
          },
          newState: {
            title: record.title,
            holidayType: record.holidayType,
            startDate: this.formatDateString(record.startDate),
            endDate: this.formatDateString(record.endDate),
            scope: record.scope,
            targetClassIds: record.targetClassIds,
          },
          reason: data.editReason.trim(),
          userId: validUserId,
        },
      });

      return record;
    });

    return this.mapHolidayToDTO(updated);
  }

  /**
   * Cancels a holiday (soft cancellation) with mandatory cancellation reason and audit log.
   */
  public static async cancelHoliday(
    tenantId: string,
    id: string,
    cancellationReason: string,
    userId?: string
  ): Promise<SchoolHolidayDTO> {
    if (!cancellationReason || !cancellationReason.trim()) {
      throw new Error('Cancellation Reason is mandatory.');
    }

    const existing = await prisma.schoolHoliday.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Holiday not found.');
    }
    if (existing.status === 'CANCELLED') {
      throw new Error('This holiday has already been cancelled.');
    }

    let validUserId: string | null = null;
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (userExists) validUserId = userExists.id;
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      const record = await tx.schoolHoliday.update({
        where: { id: existing.id },
        data: {
          status: 'CANCELLED',
          cancellationReason: cancellationReason.trim(),
          cancelledAt: new Date(),
          cancelledByUserId: validUserId,
          updatedByUserId: validUserId,
        },
        include: {
          academicSession: { select: { id: true, name: true } },
          createdBy: { select: { id: true, username: true } },
          cancelledBy: { select: { id: true, username: true } },
        },
      });

      // Audit Log
      await tx.holidayAuditLog.create({
        data: {
          tenantId,
          holidayId: record.id,
          action: 'CANCELLED',
          previousState: { status: 'ACTIVE', title: existing.title },
          newState: { status: 'CANCELLED', cancellationReason: cancellationReason.trim() },
          reason: cancellationReason.trim(),
          userId: validUserId,
        },
      });

      return record;
    });

    return this.mapHolidayToDTO(cancelled);
  }

  /**
   * Evaluates if a given date is a non-working day (Weekly Off or Active Holiday).
   */
  public static async isDateHoliday(
    tenantId: string,
    date: string | Date,
    options?: { classId?: string; sessionId?: string }
  ): Promise<{
    isHoliday: boolean;
    isWeeklyOff: boolean;
    holidayInfo?: {
      id?: string;
      title: string;
      holidayType: HolidayType;
      scope: HolidayScope;
      description?: string | null;
    } | null;
  }> {
    const targetDate = this.normalizeDate(date);
    const dayOfWeek = targetDate.getUTCDay();

    // 1. Check Weekly Off
    const weeklyOff = await this.getWeeklyOffSetting(tenantId, options?.sessionId);
    if (weeklyOff.daysOfWeek.includes(dayOfWeek)) {
      return {
        isHoliday: true,
        isWeeklyOff: true,
        holidayInfo: {
          title: dayOfWeek === 0 ? 'Sunday (Weekly Off)' : 'Weekly Off',
          holidayType: 'WEEKLY_OFF',
          scope: 'WHOLE_SCHOOL',
          description: 'Regular institution weekly off day',
        },
      };
    }

    // 2. Check Active School Holidays
    const holidays = await prisma.schoolHoliday.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
        OR: [
          { scope: 'WHOLE_SCHOOL' },
          ...(options?.sessionId ? [{ scope: 'ACADEMIC_SESSION', academicSessionId: options.sessionId }] : []),
          ...(options?.classId ? [{ scope: 'CLASS_SPECIFIC', targetClassIds: { has: options.classId } }] : []),
        ],
      },
    });

    if (holidays.length > 0) {
      const h = holidays[0];
      return {
        isHoliday: true,
        isWeeklyOff: false,
        holidayInfo: {
          id: h.id,
          title: h.title,
          holidayType: h.holidayType as HolidayType,
          scope: h.scope as HolidayScope,
          description: h.description,
        },
      };
    }

    return {
      isHoliday: false,
      isWeeklyOff: false,
      holidayInfo: null,
    };
  }

  /**
   * Computes accurate working days count and detailed day breakdown between two dates.
   */
  public static async getWorkingDaysCount(
    tenantId: string,
    startDate: string | Date,
    endDate: string | Date,
    options?: { classId?: string; sessionId?: string; includeBreakdown?: boolean }
  ): Promise<WorkingDaysCalculationResult> {
    const start = this.normalizeDate(startDate);
    const end = this.normalizeDate(endDate);

    if (end < start) {
      throw new Error('End date cannot be before start date.');
    }

    const weeklyOff = await this.getWeeklyOffSetting(tenantId, options?.sessionId);
    const activeHolidays = await prisma.schoolHoliday.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        startDate: { lte: end },
        endDate: { gte: start },
        OR: [
          { scope: 'WHOLE_SCHOOL' },
          ...(options?.sessionId ? [{ scope: 'ACADEMIC_SESSION', academicSessionId: options.sessionId }] : []),
          ...(options?.classId ? [{ scope: 'CLASS_SPECIFIC', targetClassIds: { has: options.classId } }] : []),
        ],
      },
    });

    const dayNamesMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const breakdown: DateWorkingStatus[] = [];

    let totalCalendarDays = 0;
    let weeklyOffCount = 0;
    let holidayCount = 0;
    let totalWorkingDays = 0;

    const curr = new Date(start.getTime());
    while (curr <= end) {
      totalCalendarDays++;
      const dayOfWeek = curr.getUTCDay();
      const isWeeklyOff = weeklyOff.daysOfWeek.includes(dayOfWeek);

      // Check if matches any active holiday
      const matchedHoliday = activeHolidays.find((h) => curr >= h.startDate && curr <= h.endDate);
      const isHoliday = !!matchedHoliday;

      if (isWeeklyOff) {
        weeklyOffCount++;
      } else if (isHoliday) {
        holidayCount++;
      } else {
        totalWorkingDays++;
      }

      if (options?.includeBreakdown) {
        breakdown.push({
          date: this.formatDateString(curr),
          isWorkingDay: !isWeeklyOff && !isHoliday,
          isWeeklyOff,
          isHoliday,
          holiday: matchedHoliday
            ? {
                id: matchedHoliday.id,
                title: matchedHoliday.title,
                holidayType: matchedHoliday.holidayType as HolidayType,
                scope: matchedHoliday.scope as HolidayScope,
              }
            : null,
          dayOfWeek,
          dayName: dayNamesMap[dayOfWeek],
        });
      }

      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    return {
      startDate: this.formatDateString(start),
      endDate: this.formatDateString(end),
      totalCalendarDays,
      weeklyOffCount,
      holidayCount,
      totalNonWorkingDays: weeklyOffCount + holidayCount,
      totalWorkingDays,
      dayBreakdown: options?.includeBreakdown ? breakdown : undefined,
    };
  }

  /**
   * Retrieves all holidays in a given query scope.
   */
  public static async getHolidays(
    tenantId: string,
    filter?: {
      sessionId?: string;
      status?: HolidayStatus | string;
      startDate?: string | Date;
      endDate?: string | Date;
      classId?: string;
    }
  ): Promise<SchoolHolidayDTO[]> {
    const holidays = await prisma.schoolHoliday.findMany({
      where: {
        tenantId,
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.sessionId ? { academicSessionId: filter.sessionId } : {}),
        ...(filter?.startDate && filter?.endDate
          ? {
              startDate: { lte: this.normalizeDate(filter.endDate) },
              endDate: { gte: this.normalizeDate(filter.startDate) },
            }
          : {}),
        ...(filter?.classId
          ? {
              OR: [
                { scope: 'WHOLE_SCHOOL' },
                { scope: 'CLASS_SPECIFIC', targetClassIds: { has: filter.classId } },
              ],
            }
          : {}),
      },
      include: {
        academicSession: { select: { id: true, name: true } },
        createdBy: { select: { id: true, username: true } },
        cancelledBy: { select: { id: true, username: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    // If targetClassIds present, load class names
    const allClassIds = Array.from(new Set(holidays.flatMap((h) => h.targetClassIds)));
    const classes = allClassIds.length > 0
      ? await prisma.schoolClass.findMany({
          where: { id: { in: allClassIds }, tenantId },
          select: { id: true, name: true },
        })
      : [];
    const classMap = new Map(classes.map((c) => [c.id, c.name]));

    return holidays.map((h) => {
      const dto = this.mapHolidayToDTO(h);
      dto.targetClassNames = h.targetClassIds.map((cid) => classMap.get(cid) || cid);
      return dto;
    });
  }

  /**
   * Retrieves immutable holiday audit history.
   */
  public static async getHolidayAuditLogs(tenantId: string, holidayId?: string) {
    return prisma.holidayAuditLog.findMany({
      where: {
        tenantId,
        ...(holidayId ? { holidayId } : {}),
      },
      include: {
        user: { select: { id: true, username: true } },
        holiday: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private static mapHolidayToDTO(h: any): SchoolHolidayDTO {
    const start = new Date(h.startDate);
    const end = new Date(h.endDate);
    const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return {
      id: h.id,
      tenantId: h.tenantId,
      title: h.title,
      holidayType: h.holidayType as HolidayType,
      startDate: this.formatDateString(start),
      endDate: this.formatDateString(end),
      durationDays: Math.max(1, durationDays),
      scope: h.scope as HolidayScope,
      academicSessionId: h.academicSessionId,
      academicSessionName: h.academicSession?.name || null,
      targetClassIds: h.targetClassIds || [],
      status: h.status as HolidayStatus,
      description: h.description,
      cancellationReason: h.cancellationReason,
      cancelledAt: h.cancelledAt ? h.cancelledAt.toISOString() : null,
      cancelledBy: h.cancelledBy?.username || null,
      createdBy: h.createdBy?.username || null,
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
    };
  }
}
