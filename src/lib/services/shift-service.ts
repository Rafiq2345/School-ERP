import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ShiftInputDTO {
  name: string;
  code: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  graceMinutes?: number;
  earlyExitGraceMinutes?: number;
  breakMinutes?: number;
  minHoursFullDay?: number;
  minHoursHalfDay?: number;
  workingDays?: number[]; // [1,2,3,4,5,6]
  daySpecificTimings?: Record<string, { startTime: string; endTime: string }>;
  isDefault?: boolean;
  effectiveFrom?: string | Date;
  effectiveTo?: string | Date | null;
  isActive?: boolean;
  description?: string | null;
}

export interface BulkShiftAssignmentParams {
  shiftId?: string;
  shiftIds?: string[]; // Multiple shifts support
  assignmentType: 'EMPLOYEE' | 'DEPARTMENT' | 'DESIGNATION' | 'INSTITUTIONAL_DEFAULT';
  departmentId?: string | null;
  designationId?: string | null;
  employeeIds?: string[];
  isOverride?: boolean;
  effectiveFrom: string | Date;
  effectiveTo?: string | Date | null;
  reason?: string;
  allowOverlapOverride?: boolean;
  userId?: string;
}

export interface ResolvedShiftSegment {
  shiftId: string;
  shiftName: string;
  shiftCode: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  scheduledDurationHours: number;
  graceMinutes: number;
  earlyExitGraceMinutes: number;
  breakMinutes: number;
  minHoursFullDay: number;
  minHoursHalfDay: number;
  isWorkingDay: boolean;
  precedenceSource:
    | 'EMPLOYEE_OVERRIDE'
    | 'EMPLOYEE_ASSIGNMENT'
    | 'DEPARTMENT_ASSIGNMENT'
    | 'DESIGNATION_ASSIGNMENT'
    | 'EMPLOYEE_PROFILE'
    | 'INSTITUTIONAL_DEFAULT';
}

export class ShiftService {
  /**
   * Normalizes a date to UTC midnight.
   */
  public static normalizeDate(d: string | Date): Date {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) throw new Error(`Invalid date: ${d}`);
    return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0));
  }

  /**
   * Converts HH:MM string to minutes from midnight.
   */
  public static timeStringToMinutes(t?: string | null): number {
    if (!t || !t.includes(':')) return 0;
    const [h, m] = t.split(':').map((v) => parseInt(v, 10));
    return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
  }

  /**
   * Detects whether two shift segments overlap in time on any common working days.
   */
  public static checkShiftOverlap(
    shifts: Array<{
      id: string;
      name: string;
      startTime: string;
      endTime: string;
      workingDays?: number[] | any;
    }>
  ): {
    hasOverlap: boolean;
    overlaps: Array<{ shiftA: string; shiftB: string; message: string }>;
  } {
    const overlaps: Array<{ shiftA: string; shiftB: string; message: string }> = [];

    for (let i = 0; i < shifts.length; i++) {
      for (let j = i + 1; j < shifts.length; j++) {
        const s1 = shifts[i];
        const s2 = shifts[j];

        const days1: number[] = Array.isArray(s1.workingDays) ? s1.workingDays : [1, 2, 3, 4, 5, 6];
        const days2: number[] = Array.isArray(s2.workingDays) ? s2.workingDays : [1, 2, 3, 4, 5, 6];
        const commonDays = days1.filter((d) => days2.includes(d));

        if (commonDays.length > 0) {
          let start1 = this.timeStringToMinutes(s1.startTime);
          let end1 = this.timeStringToMinutes(s1.endTime);
          let start2 = this.timeStringToMinutes(s2.startTime);
          let end2 = this.timeStringToMinutes(s2.endTime);

          if (end1 < start1) end1 += 1440; // overnight
          if (end2 < start2) end2 += 1440; // overnight

          // Intersect check: max(start1, start2) < min(end1, end2)
          const isIntersecting = Math.max(start1, start2) < Math.min(end1, end2);

          if (isIntersecting) {
            overlaps.push({
              shiftA: s1.name,
              shiftB: s2.name,
              message: `Shift "${s1.name}" (${s1.startTime}-${s1.endTime}) overlaps with "${s2.name}" (${s2.startTime}-${s2.endTime}) on common working days.`,
            });
          }
        }
      }
    }

    return {
      hasOverlap: overlaps.length > 0,
      overlaps,
    };
  }

  /**
   * Retrieves all shifts for a tenant.
   */
  public static async getShifts(tenantId: string, filters?: { isActive?: boolean; search?: string }) {
    const where: any = { tenantId };
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    return prisma.shift.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            assignments: true,
            employees: true,
          },
        },
      },
    });
  }

  /**
   * Retrieves a single shift by ID.
   */
  public static async getShiftById(tenantId: string, shiftId: string) {
    return prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        assignments: {
          include: {
            employee: true,
            department: true,
            designation: true,
          },
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });
  }

  /**
   * Creates a new reusable work shift.
   */
  public static async createShift(tenantId: string, data: ShiftInputDTO, userId?: string) {
    const effectiveFrom = data.effectiveFrom ? this.normalizeDate(data.effectiveFrom) : this.normalizeDate(new Date());
    const effectiveTo = data.effectiveTo ? this.normalizeDate(data.effectiveTo) : null;

    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.shift.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const shift = await tx.shift.create({
        data: {
          tenantId,
          name: data.name.trim(),
          code: data.code.trim().toUpperCase(),
          startTime: data.startTime,
          endTime: data.endTime,
          graceMinutes: data.graceMinutes ?? 15,
          earlyExitGraceMinutes: data.earlyExitGraceMinutes ?? 0,
          breakMinutes: data.breakMinutes ?? 0,
          minHoursFullDay: data.minHoursFullDay ?? 6.0,
          minHoursHalfDay: data.minHoursHalfDay ?? 3.5,
          workingDays: (data.workingDays as any) ?? [1, 2, 3, 4, 5, 6],
          daySpecificTimings: (data.daySpecificTimings as any) ?? undefined,
          isDefault: Boolean(data.isDefault),
          effectiveFrom,
          effectiveTo,
          isActive: data.isActive !== undefined ? data.isActive : true,
          description: data.description?.trim() || null,
        },
      });

      // Audit Log
      await tx.shiftAuditLog.create({
        data: {
          tenantId,
          shiftId: shift.id,
          action: 'CREATED',
          newState: shift as any,
          reason: 'Initial Shift Creation',
          userId,
        },
      });

      return shift;
    });
  }

  /**
   * Updates an existing shift.
   */
  public static async updateShift(tenantId: string, shiftId: string, data: Partial<ShiftInputDTO>, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.shift.findUnique({ where: { id: shiftId } });
      if (!existing || existing.tenantId !== tenantId) {
        throw new Error('Shift not found');
      }

      if (data.isDefault) {
        await tx.shift.updateMany({
          where: { tenantId, isDefault: true, id: { not: shiftId } },
          data: { isDefault: false },
        });
      }

      const updated = await tx.shift.update({
        where: { id: shiftId },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
          ...(data.startTime ? { startTime: data.startTime } : {}),
          ...(data.endTime ? { endTime: data.endTime } : {}),
          ...(data.graceMinutes !== undefined ? { graceMinutes: data.graceMinutes } : {}),
          ...(data.earlyExitGraceMinutes !== undefined ? { earlyExitGraceMinutes: data.earlyExitGraceMinutes } : {}),
          ...(data.breakMinutes !== undefined ? { breakMinutes: data.breakMinutes } : {}),
          ...(data.minHoursFullDay !== undefined ? { minHoursFullDay: data.minHoursFullDay } : {}),
          ...(data.minHoursHalfDay !== undefined ? { minHoursHalfDay: data.minHoursHalfDay } : {}),
          ...(data.workingDays ? { workingDays: data.workingDays as any } : {}),
          ...(data.daySpecificTimings !== undefined ? { daySpecificTimings: (data.daySpecificTimings as any) ?? undefined } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
          ...(data.effectiveFrom ? { effectiveFrom: this.normalizeDate(data.effectiveFrom) } : {}),
          ...(data.effectiveTo !== undefined
            ? { effectiveTo: data.effectiveTo ? this.normalizeDate(data.effectiveTo) : null }
            : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        },
      });

      // Audit Log
      await tx.shiftAuditLog.create({
        data: {
          tenantId,
          shiftId,
          action: 'UPDATED',
          previousState: existing as any,
          newState: updated as any,
          reason: 'Shift Configuration Updated',
          userId,
        },
      });

      return updated;
    });
  }

  /**
   * Preview affected employees before confirming bulk shift assignment, checking for overlaps.
   */
  public static async previewShiftAssignment(
    tenantId: string,
    params: {
      shiftIds?: string[];
      shiftId?: string;
      assignmentType: 'EMPLOYEE' | 'DEPARTMENT' | 'DESIGNATION' | 'INSTITUTIONAL_DEFAULT';
      departmentId?: string | null;
      designationId?: string | null;
      employeeIds?: string[];
      effectiveDate?: string | Date;
    }
  ) {
    const date = params.effectiveDate ? this.normalizeDate(params.effectiveDate) : this.normalizeDate(new Date());
    const targetShiftIds = params.shiftIds || (params.shiftId ? [params.shiftId] : []);

    // Check overlap among new target shifts
    const newShifts = await prisma.shift.findMany({
      where: { tenantId, id: { in: targetShiftIds } },
    });
    const overlapCheck = this.checkShiftOverlap(newShifts);

    let whereClause: any = { tenantId, currentStatus: 'ACTIVE' };
    if (params.assignmentType === 'DEPARTMENT' && params.departmentId) {
      whereClause.departmentId = params.departmentId;
    } else if (params.assignmentType === 'DESIGNATION' && params.designationId) {
      whereClause.designationId = params.designationId;
    } else if (params.assignmentType === 'EMPLOYEE' && params.employeeIds && params.employeeIds.length > 0) {
      whereClause.id = { in: params.employeeIds };
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: { department: true, designation: true },
      orderBy: [{ departmentId: 'asc' }, { employeeNo: 'asc' }],
    });

    const previewList = await Promise.all(
      employees.map(async (emp) => {
        const currentActiveShifts = await this.getApplicableShiftsForEmployee(tenantId, emp.id, date);
        const shiftSummaries = currentActiveShifts.map(
          (s) => `${s.shiftName} (${s.scheduledStartTime}-${s.scheduledEndTime})`
        );

        return {
          employeeId: emp.id,
          employeeNo: emp.employeeNo,
          name: `${emp.firstNameEn} ${emp.lastNameEn || ''}`.trim(),
          departmentName: emp.department?.name || 'General',
          designationName: emp.designation?.name || 'Staff',
          currentShiftCount: currentActiveShifts.length,
          currentShifts: shiftSummaries.join(', ') || 'Default Shift',
          precedenceApplied: currentActiveShifts[0]?.precedenceSource || 'INSTITUTIONAL_DEFAULT',
          proposedShifts: newShifts.map((s) => `${s.name} (${s.startTime}-${s.endTime})`).join(', '),
        };
      })
    );

    return {
      totalAffected: previewList.length,
      hasOverlapWarning: overlapCheck.hasOverlap,
      overlapWarnings: overlapCheck.overlaps,
      employees: previewList,
    };
  }

  /**
   * Bulk Multi-Shift Assignment with Effective-Dated History Preservation and Overlap Enforcement.
   */
  public static async assignShiftBulk(tenantId: string, params: BulkShiftAssignmentParams) {
    const effectiveFrom = this.normalizeDate(params.effectiveFrom);
    const effectiveTo = params.effectiveTo ? this.normalizeDate(params.effectiveTo) : null;

    const targetShiftIds = params.shiftIds || (params.shiftId ? [params.shiftId] : []);
    if (targetShiftIds.length === 0) {
      throw new Error('At least one shift must be selected for assignment.');
    }

    const shifts = await prisma.shift.findMany({
      where: { tenantId, id: { in: targetShiftIds } },
    });
    if (shifts.length !== targetShiftIds.length) {
      throw new Error('One or more selected shifts not found in this institution.');
    }

    // Overlap validation
    const overlapCheck = this.checkShiftOverlap(shifts);
    if (overlapCheck.hasOverlap && !params.allowOverlapOverride) {
      const msg = overlapCheck.overlaps.map((o) => o.message).join(' | ');
      throw new Error(`Cannot assign overlapping work shifts: ${msg}`);
    }

    return prisma.$transaction(async (tx) => {
      let targetEmployeeIds: string[] = [];

      if (params.assignmentType === 'DEPARTMENT' && params.departmentId) {
        const emps = await tx.employee.findMany({
          where: { tenantId, departmentId: params.departmentId, currentStatus: 'ACTIVE' },
          select: { id: true },
        });
        targetEmployeeIds = emps.map((e) => e.id);

        // Close previous active department assignments
        await tx.employeeShiftAssignment.updateMany({
          where: {
            tenantId,
            departmentId: params.departmentId,
            assignmentType: 'DEPARTMENT',
            effectiveTo: null,
            effectiveFrom: { lte: effectiveFrom },
          },
          data: { effectiveTo: new Date(effectiveFrom.getTime() - 86400000) },
        });

        // Create new assignments for each shift
        for (const sId of targetShiftIds) {
          await tx.employeeShiftAssignment.create({
            data: {
              tenantId,
              shiftId: sId,
              assignmentType: 'DEPARTMENT',
              departmentId: params.departmentId,
              isOverride: false,
              effectiveFrom,
              effectiveTo,
              reason: params.reason || 'Bulk Department Assignment',
              assignedByUserId: params.userId,
            },
          });
        }
      } else if (params.assignmentType === 'DESIGNATION' && params.designationId) {
        const emps = await tx.employee.findMany({
          where: { tenantId, designationId: params.designationId, currentStatus: 'ACTIVE' },
          select: { id: true },
        });
        targetEmployeeIds = emps.map((e) => e.id);

        // Close previous active designation assignments
        await tx.employeeShiftAssignment.updateMany({
          where: {
            tenantId,
            designationId: params.designationId,
            assignmentType: 'DESIGNATION',
            effectiveTo: null,
            effectiveFrom: { lte: effectiveFrom },
          },
          data: { effectiveTo: new Date(effectiveFrom.getTime() - 86400000) },
        });

        // Create new assignments for each shift
        for (const sId of targetShiftIds) {
          await tx.employeeShiftAssignment.create({
            data: {
              tenantId,
              shiftId: sId,
              assignmentType: 'DESIGNATION',
              designationId: params.designationId,
              isOverride: false,
              effectiveFrom,
              effectiveTo,
              reason: params.reason || 'Bulk Designation Assignment',
              assignedByUserId: params.userId,
            },
          });
        }
      } else if (params.assignmentType === 'EMPLOYEE' && params.employeeIds && params.employeeIds.length > 0) {
        targetEmployeeIds = params.employeeIds;

        for (const empId of targetEmployeeIds) {
          // Close previous open assignments starting before or at effectiveFrom
          await tx.employeeShiftAssignment.updateMany({
            where: {
              tenantId,
              employeeId: empId,
              effectiveTo: null,
              effectiveFrom: { lte: effectiveFrom },
            },
            data: { effectiveTo: new Date(effectiveFrom.getTime() - 86400000) },
          });

          // Create new assignments for each shift
          for (const sId of targetShiftIds) {
            await tx.employeeShiftAssignment.create({
              data: {
                tenantId,
                shiftId: sId,
                assignmentType: 'EMPLOYEE',
                employeeId: empId,
                isOverride: Boolean(params.isOverride),
                effectiveFrom,
                effectiveTo,
                reason: params.reason || (params.isOverride ? 'Employee Schedule Override' : 'Direct Assignment'),
                assignedByUserId: params.userId,
              },
            });
          }

          // Update primary shiftId on employee model as fallback
          if (targetShiftIds[0]) {
            await tx.employee.update({
              where: { id: empId },
              data: { shiftId: targetShiftIds[0] },
            });
          }
        }
      }

      // Record Audit Log
      await tx.shiftAuditLog.create({
        data: {
          tenantId,
          shiftId: targetShiftIds[0],
          action: params.isOverride ? 'OVERRIDE_CREATED' : 'BULK_ASSIGNED',
          affectedEmployeesCount: targetEmployeeIds.length,
          reason: params.reason || `Assigned ${targetShiftIds.length} shifts to ${targetEmployeeIds.length} staff`,
          userId: params.userId,
          newState: {
            shiftIds: targetShiftIds,
            assignmentType: params.assignmentType,
            targetCount: targetEmployeeIds.length,
            effectiveFrom: effectiveFrom.toISOString(),
            effectiveTo: effectiveTo?.toISOString() || null,
          } as any,
        },
      });

      return {
        success: true,
        shiftIds: targetShiftIds,
        assignmentType: params.assignmentType,
        affectedEmployeesCount: targetEmployeeIds.length,
      };
    });
  }

  /**
   * CORE MULTI-SHIFT RESOLUTION HIERARCHY ENGINE:
   * Resolves ALL applicable shift segments for an employee on a specific attendance date.
   *
   * Hierarchy Precedence:
   * 1. Employee-specific override (returns all active overrides with isOverride=true)
   * 2. Direct Employee assignments (returns all active assignments for employee)
   * 3. Department bulk assignments (returns all active assignments for department)
   * 4. Designation bulk assignments (returns all active assignments for designation)
   * 5. Direct employee.shiftId link
   * 6. Institutional Default Shift
   */
  public static async getApplicableShiftsForEmployee(
    tenantId: string,
    employeeId: string,
    dateInput: string | Date
  ): Promise<ResolvedShiftSegment[]> {
    const date = this.normalizeDate(dateInput);
    const dayOfWeek = date.getUTCDay(); // 0=Sunday, 1=Monday ... 6=Saturday

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true },
    });

    if (!employee || employee.tenantId !== tenantId) {
      throw new Error(`Employee ${employeeId} not found`);
    }

    let rawShifts: any[] = [];
    let precedenceSource: ResolvedShiftSegment['precedenceSource'] = 'INSTITUTIONAL_DEFAULT';

    // Step 1: Check Employee-Specific Override (isOverride = true)
    const overrides = await prisma.employeeShiftAssignment.findMany({
      where: {
        tenantId,
        employeeId,
        isOverride: true,
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      include: { shift: true },
      orderBy: { shift: { startTime: 'asc' } },
    });

    if (overrides.length > 0) {
      rawShifts = overrides.map((o) => ({ ...o.shift, assignmentApplicableDays: o.applicableDays }));
      precedenceSource = 'EMPLOYEE_OVERRIDE';
    }

    // Step 2: Check Direct Employee Assignments (isOverride = false)
    if (rawShifts.length === 0) {
      const empAssignments = await prisma.employeeShiftAssignment.findMany({
        where: {
          tenantId,
          employeeId,
          isOverride: false,
          isActive: true,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        include: { shift: true },
        orderBy: { shift: { startTime: 'asc' } },
      });

      if (empAssignments.length > 0) {
        rawShifts = empAssignments.map((a) => ({ ...a.shift, assignmentApplicableDays: a.applicableDays }));
        precedenceSource = 'EMPLOYEE_ASSIGNMENT';
      }
    }

    // Step 3: Check Department Assignments
    if (rawShifts.length === 0 && employee.departmentId) {
      const deptAssignments = await prisma.employeeShiftAssignment.findMany({
        where: {
          tenantId,
          assignmentType: 'DEPARTMENT',
          departmentId: employee.departmentId,
          isActive: true,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        include: { shift: true },
        orderBy: { shift: { startTime: 'asc' } },
      });

      if (deptAssignments.length > 0) {
        rawShifts = deptAssignments.map((a) => ({ ...a.shift, assignmentApplicableDays: a.applicableDays }));
        precedenceSource = 'DEPARTMENT_ASSIGNMENT';
      }
    }

    // Step 4: Check Designation Assignments
    if (rawShifts.length === 0 && employee.designationId) {
      const desigAssignments = await prisma.employeeShiftAssignment.findMany({
        where: {
          tenantId,
          assignmentType: 'DESIGNATION',
          designationId: employee.designationId,
          isActive: true,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        include: { shift: true },
        orderBy: { shift: { startTime: 'asc' } },
      });

      if (desigAssignments.length > 0) {
        rawShifts = desigAssignments.map((a) => ({ ...a.shift, assignmentApplicableDays: a.applicableDays }));
        precedenceSource = 'DESIGNATION_ASSIGNMENT';
      }
    }

    // Step 5: Direct employee.shiftId link
    if (rawShifts.length === 0 && employee.shift) {
      rawShifts = [employee.shift];
      precedenceSource = 'EMPLOYEE_PROFILE';
    }

    // Step 6: Institutional Default Shift
    if (rawShifts.length === 0) {
      const defaultShift = await prisma.shift.findFirst({
        where: { tenantId, isActive: true, isDefault: true },
      });
      if (defaultShift) {
        rawShifts = [defaultShift];
      } else {
        const anyShift = await prisma.shift.findFirst({
          where: { tenantId, isActive: true },
          orderBy: { createdAt: 'asc' },
        });
        if (anyShift) rawShifts = [anyShift];
      }
      precedenceSource = 'INSTITUTIONAL_DEFAULT';
    }

    // Fallback if zero shifts in database
    if (rawShifts.length === 0) {
      rawShifts = [
        {
          id: 'default-shift',
          name: 'Standard Full Day',
          code: 'SHIFT-STD',
          startTime: '08:00',
          endTime: '16:00',
          graceMinutes: 15,
          earlyExitGraceMinutes: 0,
          breakMinutes: 0,
          minHoursFullDay: 6.0,
          minHoursHalfDay: 3.5,
          workingDays: [1, 2, 3, 4, 5, 6],
        },
      ];
    }

    // Map each raw shift and filter by working day
    const segments: ResolvedShiftSegment[] = rawShifts
      .map((s) => {
        const defaultStart = s.startTime || '08:00';
        const defaultEnd = s.endTime || '16:00';

        // Check variable timing override for dayOfWeek (e.g. Friday)
        let finalStart = defaultStart;
        let finalEnd = defaultEnd;

        if (s.daySpecificTimings) {
          const timingsObj = s.daySpecificTimings as Record<string, { startTime: string; endTime: string }>;
          const dayKey = dayOfWeek.toString();
          if (timingsObj[dayKey]) {
            finalStart = timingsObj[dayKey].startTime || finalStart;
            finalEnd = timingsObj[dayKey].endTime || finalEnd;
          }
        }

        // Check if dayOfWeek is a working day
        const workingDaysList: number[] = Array.isArray(s.assignmentApplicableDays)
          ? s.assignmentApplicableDays
          : Array.isArray(s.workingDays)
          ? s.workingDays
          : [1, 2, 3, 4, 5, 6];

        const isWorkingDay = workingDaysList.includes(dayOfWeek);

        // Calculate scheduled duration hours
        const startMin = ShiftService.timeStringToMinutes(finalStart);
        let endMin = ShiftService.timeStringToMinutes(finalEnd);
        if (endMin < startMin) endMin += 1440; // Overnight
        const scheduledDurationHours = Math.round(((endMin - startMin) / 60) * 100) / 100;

        return {
          shiftId: s.id,
          shiftName: s.name,
          shiftCode: s.code,
          scheduledStartTime: finalStart,
          scheduledEndTime: finalEnd,
          scheduledDurationHours,
          graceMinutes: s.graceMinutes ?? 15,
          earlyExitGraceMinutes: s.earlyExitGraceMinutes ?? 0,
          breakMinutes: s.breakMinutes ?? 0,
          minHoursFullDay: Number(s.minHoursFullDay || 6.0),
          minHoursHalfDay: Number(s.minHoursHalfDay || 3.5),
          isWorkingDay,
          precedenceSource,
        };
      })
      .filter((seg) => seg.isWorkingDay); // Keep active segments on this date

    // Sort chronologically by scheduled start time
    segments.sort((a, b) => ShiftService.timeStringToMinutes(a.scheduledStartTime) - ShiftService.timeStringToMinutes(b.scheduledStartTime));

    return segments;
  }

  /**
   * Helper for backward compatibility returning primary shift.
   */
  public static async getApplicableShiftForEmployee(
    tenantId: string,
    employeeId: string,
    dateInput: string | Date
  ): Promise<ResolvedShiftSegment> {
    const shifts = await this.getApplicableShiftsForEmployee(tenantId, employeeId, dateInput);
    return (
      shifts[0] || {
        shiftId: 'default-shift',
        shiftName: 'Standard Full Day',
        shiftCode: 'SHIFT-STD',
        scheduledStartTime: '08:00',
        scheduledEndTime: '16:00',
        scheduledDurationHours: 8.0,
        graceMinutes: 15,
        earlyExitGraceMinutes: 0,
        breakMinutes: 0,
        minHoursFullDay: 6.0,
        minHoursHalfDay: 3.5,
        isWorkingDay: true,
        precedenceSource: 'INSTITUTIONAL_DEFAULT',
      }
    );
  }

  /**
   * Retrieves Shift Audit Logs.
   */
  public static async getShiftAuditLogs(tenantId: string, filters?: { shiftId?: string; limit?: number }) {
    const where: any = { tenantId };
    if (filters?.shiftId) where.shiftId = filters.shiftId;

    return prisma.shiftAuditLog.findMany({
      where,
      include: { shift: true },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }
}
