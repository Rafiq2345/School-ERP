import { PrismaClient } from '@prisma/client';
import { ShiftService, ResolvedShiftSegment } from './shift-service';

const prisma = new PrismaClient();

export interface WorkScheduleDayInputDTO {
  dayOfWeek: number; // 0=Sunday, 1=Monday ... 6=Saturday
  isWorkingDay: boolean;
  shiftIds: string[]; // List of Shift UUIDs
}

export interface WorkScheduleInputDTO {
  name: string;
  code: string;
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  effectiveFrom?: string | Date;
  effectiveTo?: string | Date | null;
  days: WorkScheduleDayInputDTO[];
}

export interface BulkScheduleAssignmentParams {
  scheduleId: string;
  assignmentType: 'EMPLOYEE' | 'DEPARTMENT' | 'DESIGNATION' | 'EMPLOYMENT_TYPE' | 'INSTITUTIONAL_DEFAULT';
  departmentId?: string | null;
  designationId?: string | null;
  employmentTypeId?: string | null;
  employeeIds?: string[];
  isOverride?: boolean;
  effectiveFrom: string | Date;
  effectiveTo?: string | Date | null;
  reason?: string;
  userId?: string;
}

export class WorkScheduleService {
  /**
   * Normalizes a date to UTC midnight.
   */
  public static normalizeDate(d: string | Date): Date {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) throw new Error(`Invalid date: ${d}`);
    return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0));
  }

  /**
   * Retrieves all Work Schedules for a tenant.
   */
  public static async getWorkSchedules(tenantId: string, filters?: { isActive?: boolean; search?: string }) {
    const where: any = { tenantId };
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    return prisma.workSchedule.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        days: true,
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });
  }

  /**
   * Retrieves a single Work Schedule by ID with detailed days and shifts.
   */
  public static async getWorkScheduleById(tenantId: string, scheduleId: string) {
    const schedule = await prisma.workSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        days: { orderBy: { dayOfWeek: 'asc' } },
        assignments: {
          include: {
            employee: true,
            department: true,
            designation: true,
            employmentType: true,
          },
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });

    if (!schedule || schedule.tenantId !== tenantId) return null;

    // Load full Shift objects for each day
    const allShiftIds = new Set<string>();
    schedule.days.forEach((d) => {
      if (Array.isArray(d.shiftIds)) {
        (d.shiftIds as string[]).forEach((id) => allShiftIds.add(id));
      }
    });

    const shifts = await prisma.shift.findMany({
      where: { tenantId, id: { in: Array.from(allShiftIds) } },
    });
    const shiftMap = new Map(shifts.map((s) => [s.id, s]));

    const daysWithShifts = schedule.days.map((d) => {
      const sList = Array.isArray(d.shiftIds)
        ? (d.shiftIds as string[]).map((id) => shiftMap.get(id)).filter(Boolean)
        : [];
      return {
        ...d,
        shifts: sList,
      };
    });

    return {
      ...schedule,
      days: daysWithShifts,
    };
  }

  /**
   * Creates a new reusable Work Schedule profile with day definitions and overlap checks.
   */
  public static async createWorkSchedule(tenantId: string, data: WorkScheduleInputDTO, userId?: string) {
    const effectiveFrom = data.effectiveFrom ? this.normalizeDate(data.effectiveFrom) : this.normalizeDate(new Date());
    const effectiveTo = data.effectiveTo ? this.normalizeDate(data.effectiveTo) : null;

    // Validate shift overlap on each working day
    for (const day of data.days) {
      if (day.isWorkingDay && day.shiftIds && day.shiftIds.length > 1) {
        const shifts = await prisma.shift.findMany({
          where: { tenantId, id: { in: day.shiftIds } },
        });
        const overlap = ShiftService.checkShiftOverlap(shifts);
        if (overlap.hasOverlap) {
          const msg = overlap.overlaps.map((o) => o.message).join(' | ');
          throw new Error(`Day ${day.dayOfWeek} contains overlapping work shifts: ${msg}`);
        }
      }
    }

    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.workSchedule.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const schedule = await tx.workSchedule.create({
        data: {
          tenantId,
          name: data.name.trim(),
          code: data.code.trim().toUpperCase(),
          description: data.description?.trim() || null,
          isDefault: Boolean(data.isDefault),
          isActive: data.isActive !== undefined ? data.isActive : true,
          effectiveFrom,
          effectiveTo,
          days: {
            create: data.days.map((d) => ({
              dayOfWeek: d.dayOfWeek,
              isWorkingDay: d.isWorkingDay,
              shiftIds: d.shiftIds || [],
            })),
          },
        },
        include: { days: true },
      });

      // Audit Log
      await tx.shiftAuditLog.create({
        data: {
          tenantId,
          action: 'CREATED',
          newState: schedule as any,
          reason: `Work Schedule "${schedule.name}" created`,
          userId,
        },
      });

      return schedule;
    });
  }

  /**
   * Updates an existing Work Schedule profile.
   */
  public static async updateWorkSchedule(
    tenantId: string,
    scheduleId: string,
    data: Partial<WorkScheduleInputDTO>,
    userId?: string
  ) {
    const existing = await prisma.workSchedule.findUnique({
      where: { id: scheduleId },
      include: { days: true },
    });
    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('Work schedule not found');
    }

    // Validate shift overlap on days if updated
    if (data.days) {
      for (const day of data.days) {
        if (day.isWorkingDay && day.shiftIds && day.shiftIds.length > 1) {
          const shifts = await prisma.shift.findMany({
            where: { tenantId, id: { in: day.shiftIds } },
          });
          const overlap = ShiftService.checkShiftOverlap(shifts);
          if (overlap.hasOverlap) {
            const msg = overlap.overlaps.map((o) => o.message).join(' | ');
            throw new Error(`Day ${day.dayOfWeek} contains overlapping work shifts: ${msg}`);
          }
        }
      }
    }

    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.workSchedule.updateMany({
          where: { tenantId, isDefault: true, id: { not: scheduleId } },
          data: { isDefault: false },
        });
      }

      // Update days if provided
      if (data.days) {
        await tx.workScheduleDay.deleteMany({ where: { workScheduleId: scheduleId } });
        for (const d of data.days) {
          await tx.workScheduleDay.create({
            data: {
              workScheduleId: scheduleId,
              dayOfWeek: d.dayOfWeek,
              isWorkingDay: d.isWorkingDay,
              shiftIds: d.shiftIds || [],
            },
          });
        }
      }

      const updated = await tx.workSchedule.update({
        where: { id: scheduleId },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
          ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.effectiveFrom ? { effectiveFrom: this.normalizeDate(data.effectiveFrom) } : {}),
          ...(data.effectiveTo !== undefined
            ? { effectiveTo: data.effectiveTo ? this.normalizeDate(data.effectiveTo) : null }
            : {}),
        },
        include: { days: true },
      });

      // Audit Log
      await tx.shiftAuditLog.create({
        data: {
          tenantId,
          action: 'UPDATED',
          previousState: existing as any,
          newState: updated as any,
          reason: `Work Schedule "${updated.name}" updated`,
          userId,
        },
      });

      return updated;
    });
  }

  /**
   * Previews affected employees prior to bulk schedule assignment.
   */
  public static async previewScheduleAssignment(
    tenantId: string,
    params: {
      scheduleId: string;
      assignmentType: 'EMPLOYEE' | 'DEPARTMENT' | 'DESIGNATION' | 'EMPLOYMENT_TYPE' | 'INSTITUTIONAL_DEFAULT';
      departmentId?: string | null;
      designationId?: string | null;
      employmentTypeId?: string | null;
      employeeIds?: string[];
      effectiveDate?: string | Date;
    }
  ) {
    const date = params.effectiveDate ? this.normalizeDate(params.effectiveDate) : this.normalizeDate(new Date());

    let whereClause: any = { tenantId, currentStatus: 'ACTIVE' };
    if (params.assignmentType === 'DEPARTMENT' && params.departmentId) {
      whereClause.departmentId = params.departmentId;
    } else if (params.assignmentType === 'DESIGNATION' && params.designationId) {
      whereClause.designationId = params.designationId;
    } else if (params.assignmentType === 'EMPLOYMENT_TYPE' && params.employmentTypeId) {
      whereClause.employmentTypeId = params.employmentTypeId;
    } else if (params.assignmentType === 'EMPLOYEE' && params.employeeIds && params.employeeIds.length > 0) {
      whereClause.id = { in: params.employeeIds };
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: { department: true, designation: true, employmentType: true },
      orderBy: [{ departmentId: 'asc' }, { employeeNo: 'asc' }],
    });

    const targetSchedule = await prisma.workSchedule.findUnique({ where: { id: params.scheduleId } });

    const previewList = await Promise.all(
      employees.map(async (emp) => {
        const resolved = await this.resolveWorkScheduleForEmployee(tenantId, emp.id, date);
        return {
          employeeId: emp.id,
          employeeNo: emp.employeeNo,
          name: `${emp.firstNameEn} ${emp.lastNameEn || ''}`.trim(),
          departmentName: emp.department?.name || 'General',
          designationName: emp.designation?.name || 'Staff',
          currentScheduleName: resolved.scheduleName,
          currentPrecedence: resolved.precedenceSource,
          currentDayShifts: resolved.shifts.map((s) => `${s.shiftName} (${s.scheduledStartTime}-${s.scheduledEndTime})`).join(', ') || 'Off Day',
          proposedScheduleName: targetSchedule?.name || 'New Schedule',
        };
      })
    );

    return {
      totalAffected: previewList.length,
      employees: previewList,
    };
  }

  /**
   * Bulk assigns a Work Schedule with effective-dating.
   */
  public static async assignScheduleBulk(tenantId: string, params: BulkScheduleAssignmentParams) {
    const effectiveFrom = this.normalizeDate(params.effectiveFrom);
    const effectiveTo = params.effectiveTo ? this.normalizeDate(params.effectiveTo) : null;

    const schedule = await prisma.workSchedule.findUnique({ where: { id: params.scheduleId } });
    if (!schedule || schedule.tenantId !== tenantId) {
      throw new Error('Target Work Schedule not found');
    }

    return prisma.$transaction(async (tx) => {
      let targetEmployeeIds: string[] = [];

      if (params.assignmentType === 'DEPARTMENT' && params.departmentId) {
        const emps = await tx.employee.findMany({
          where: { tenantId, departmentId: params.departmentId, currentStatus: 'ACTIVE' },
          select: { id: true },
        });
        targetEmployeeIds = emps.map((e) => e.id);

        // Close previous active department schedule assignments
        await tx.employeeScheduleAssignment.updateMany({
          where: {
            tenantId,
            departmentId: params.departmentId,
            assignmentType: 'DEPARTMENT',
            effectiveTo: null,
            effectiveFrom: { lte: effectiveFrom },
          },
          data: { effectiveTo: new Date(effectiveFrom.getTime() - 86400000) },
        });

        await tx.employeeScheduleAssignment.create({
          data: {
            tenantId,
            scheduleId: params.scheduleId,
            assignmentType: 'DEPARTMENT',
            departmentId: params.departmentId,
            isOverride: false,
            effectiveFrom,
            effectiveTo,
            reason: params.reason || 'Bulk Department Schedule Assignment',
            assignedByUserId: params.userId,
          },
        });
      } else if (params.assignmentType === 'DESIGNATION' && params.designationId) {
        const emps = await tx.employee.findMany({
          where: { tenantId, designationId: params.designationId, currentStatus: 'ACTIVE' },
          select: { id: true },
        });
        targetEmployeeIds = emps.map((e) => e.id);

        // Close previous active designation schedule assignments
        await tx.employeeScheduleAssignment.updateMany({
          where: {
            tenantId,
            designationId: params.designationId,
            assignmentType: 'DESIGNATION',
            effectiveTo: null,
            effectiveFrom: { lte: effectiveFrom },
          },
          data: { effectiveTo: new Date(effectiveFrom.getTime() - 86400000) },
        });

        await tx.employeeScheduleAssignment.create({
          data: {
            tenantId,
            scheduleId: params.scheduleId,
            assignmentType: 'DESIGNATION',
            designationId: params.designationId,
            isOverride: false,
            effectiveFrom,
            effectiveTo,
            reason: params.reason || 'Bulk Designation Schedule Assignment',
            assignedByUserId: params.userId,
          },
        });
      } else if (params.assignmentType === 'EMPLOYMENT_TYPE' && params.employmentTypeId) {
        const emps = await tx.employee.findMany({
          where: { tenantId, employmentTypeId: params.employmentTypeId, currentStatus: 'ACTIVE' },
          select: { id: true },
        });
        targetEmployeeIds = emps.map((e) => e.id);

        await tx.employeeScheduleAssignment.updateMany({
          where: {
            tenantId,
            employmentTypeId: params.employmentTypeId,
            assignmentType: 'EMPLOYMENT_TYPE',
            effectiveTo: null,
            effectiveFrom: { lte: effectiveFrom },
          },
          data: { effectiveTo: new Date(effectiveFrom.getTime() - 86400000) },
        });

        await tx.employeeScheduleAssignment.create({
          data: {
            tenantId,
            scheduleId: params.scheduleId,
            assignmentType: 'EMPLOYMENT_TYPE',
            employmentTypeId: params.employmentTypeId,
            isOverride: false,
            effectiveFrom,
            effectiveTo,
            reason: params.reason || 'Bulk Employment Type Schedule Assignment',
            assignedByUserId: params.userId,
          },
        });
      } else if (params.assignmentType === 'EMPLOYEE' && params.employeeIds && params.employeeIds.length > 0) {
        targetEmployeeIds = params.employeeIds;

        for (const empId of targetEmployeeIds) {
          await tx.employeeScheduleAssignment.updateMany({
            where: {
              tenantId,
              employeeId: empId,
              effectiveTo: null,
              effectiveFrom: { lte: effectiveFrom },
            },
            data: { effectiveTo: new Date(effectiveFrom.getTime() - 86400000) },
          });

          await tx.employeeScheduleAssignment.create({
            data: {
              tenantId,
              scheduleId: params.scheduleId,
              assignmentType: 'EMPLOYEE',
              employeeId: empId,
              isOverride: Boolean(params.isOverride),
              effectiveFrom,
              effectiveTo,
              reason: params.reason || (params.isOverride ? 'Employee Schedule Exception' : 'Direct Schedule Assignment'),
              assignedByUserId: params.userId,
            },
          });
        }
      }

      // Record Audit Log
      await tx.shiftAuditLog.create({
        data: {
          tenantId,
          action: params.isOverride ? 'OVERRIDE_CREATED' : 'BULK_ASSIGNED',
          affectedEmployeesCount: targetEmployeeIds.length,
          reason: params.reason || `Assigned schedule "${schedule.name}" to ${targetEmployeeIds.length} staff`,
          userId: params.userId,
          newState: {
            scheduleId: params.scheduleId,
            assignmentType: params.assignmentType,
            targetCount: targetEmployeeIds.length,
            effectiveFrom: effectiveFrom.toISOString(),
            effectiveTo: effectiveTo?.toISOString() || null,
          } as any,
        },
      });

      return {
        success: true,
        scheduleId: params.scheduleId,
        assignmentType: params.assignmentType,
        affectedEmployeesCount: targetEmployeeIds.length,
      };
    });
  }

  /**
   * CORE SCHEDULE RESOLUTION ENGINE:
   * Resolves the applicable Work Schedule and shifts for an employee on a specific attendance date.
   */
  public static async resolveWorkScheduleForEmployee(
    tenantId: string,
    employeeId: string,
    dateInput: string | Date
  ): Promise<{
    scheduleId: string;
    scheduleName: string;
    scheduleCode: string;
    isWorkingDay: boolean;
    precedenceSource:
      | 'EMPLOYEE_OVERRIDE'
      | 'EMPLOYEE_ASSIGNMENT'
      | 'DEPARTMENT_ASSIGNMENT'
      | 'DESIGNATION_ASSIGNMENT'
      | 'EMPLOYMENT_TYPE_ASSIGNMENT'
      | 'EMPLOYEE_PROFILE'
      | 'INSTITUTIONAL_DEFAULT';
    shifts: ResolvedShiftSegment[];
  }> {
    const date = this.normalizeDate(dateInput);
    const dayOfWeek = date.getUTCDay(); // 0=Sunday, 1=Monday ... 6=Saturday

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true },
    });

    if (!employee || employee.tenantId !== tenantId) {
      throw new Error(`Employee ${employeeId} not found`);
    }

    let resolvedSchedule: any = null;
    let precedenceSource: any = 'INSTITUTIONAL_DEFAULT';

    // Step 1: Check Employee-Specific Override (isOverride = true)
    const override = await prisma.employeeScheduleAssignment.findFirst({
      where: {
        tenantId,
        employeeId,
        isOverride: true,
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      include: {
        schedule: {
          include: { days: true },
        },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (override?.schedule) {
      resolvedSchedule = override.schedule;
      precedenceSource = 'EMPLOYEE_OVERRIDE';
    }

    // Step 2: Check Direct Employee Schedule Assignment
    if (!resolvedSchedule) {
      const empAssignment = await prisma.employeeScheduleAssignment.findFirst({
        where: {
          tenantId,
          employeeId,
          isOverride: false,
          isActive: true,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        include: {
          schedule: {
            include: { days: true },
          },
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (empAssignment?.schedule) {
        resolvedSchedule = empAssignment.schedule;
        precedenceSource = 'EMPLOYEE_ASSIGNMENT';
      }
    }

    // Step 3: Check Department Schedule Assignment
    if (!resolvedSchedule && employee.departmentId) {
      const deptAssignment = await prisma.employeeScheduleAssignment.findFirst({
        where: {
          tenantId,
          assignmentType: 'DEPARTMENT',
          departmentId: employee.departmentId,
          isActive: true,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        include: {
          schedule: {
            include: { days: true },
          },
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (deptAssignment?.schedule) {
        resolvedSchedule = deptAssignment.schedule;
        precedenceSource = 'DEPARTMENT_ASSIGNMENT';
      }
    }

    // Step 4: Check Designation Schedule Assignment
    if (!resolvedSchedule && employee.designationId) {
      const desigAssignment = await prisma.employeeScheduleAssignment.findFirst({
        where: {
          tenantId,
          assignmentType: 'DESIGNATION',
          designationId: employee.designationId,
          isActive: true,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        include: {
          schedule: {
            include: { days: true },
          },
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (desigAssignment?.schedule) {
        resolvedSchedule = desigAssignment.schedule;
        precedenceSource = 'DESIGNATION_ASSIGNMENT';
      }
    }

    // Step 5: Check Employment Type Schedule Assignment
    if (!resolvedSchedule && employee.employmentTypeId) {
      const empTypeAssignment = await prisma.employeeScheduleAssignment.findFirst({
        where: {
          tenantId,
          assignmentType: 'EMPLOYMENT_TYPE',
          employmentTypeId: employee.employmentTypeId,
          isActive: true,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        include: {
          schedule: {
            include: { days: true },
          },
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (empTypeAssignment?.schedule) {
        resolvedSchedule = empTypeAssignment.schedule;
        precedenceSource = 'EMPLOYMENT_TYPE_ASSIGNMENT';
      }
    }

    // Step 6: Institutional Default Work Schedule
    if (!resolvedSchedule) {
      resolvedSchedule = await prisma.workSchedule.findFirst({
        where: { tenantId, isActive: true, isDefault: true },
        include: { days: true },
      });

      if (!resolvedSchedule) {
        resolvedSchedule = await prisma.workSchedule.findFirst({
          where: { tenantId, isActive: true },
          include: { days: true },
          orderBy: { createdAt: 'asc' },
        });
      }

      precedenceSource = 'INSTITUTIONAL_DEFAULT';
    }

    // If a Work Schedule is resolved, resolve shifts for today's dayOfWeek
    if (resolvedSchedule && resolvedSchedule.days) {
      const dayDef = resolvedSchedule.days.find((d: any) => d.dayOfWeek === dayOfWeek);

      if (!dayDef || !dayDef.isWorkingDay) {
        return {
          scheduleId: resolvedSchedule.id,
          scheduleName: resolvedSchedule.name,
          scheduleCode: resolvedSchedule.code,
          isWorkingDay: false,
          precedenceSource,
          shifts: [],
        };
      }

      const shiftIds = Array.isArray(dayDef.shiftIds) ? (dayDef.shiftIds as string[]) : [];
      if (shiftIds.length > 0) {
        const rawShifts = await prisma.shift.findMany({
          where: { tenantId, id: { in: shiftIds } },
        });

        const segments: ResolvedShiftSegment[] = rawShifts.map((s) => {
          const startMin = ShiftService.timeStringToMinutes(s.startTime);
          let endMin = ShiftService.timeStringToMinutes(s.endTime);
          if (endMin < startMin) endMin += 1440; // Overnight
          const scheduledDurationHours = Math.round(((endMin - startMin) / 60) * 100) / 100;

          return {
            shiftId: s.id,
            shiftName: s.name,
            shiftCode: s.code,
            scheduledStartTime: s.startTime,
            scheduledEndTime: s.endTime,
            scheduledDurationHours,
            graceMinutes: s.graceMinutes ?? 15,
            earlyExitGraceMinutes: s.earlyExitGraceMinutes ?? 0,
            breakMinutes: s.breakMinutes ?? 0,
            minHoursFullDay: Number(s.minHoursFullDay || 6.0),
            minHoursHalfDay: Number(s.minHoursHalfDay || 3.5),
            isWorkingDay: true,
            precedenceSource,
          };
        });

        segments.sort(
          (a, b) =>
            ShiftService.timeStringToMinutes(a.scheduledStartTime) -
            ShiftService.timeStringToMinutes(b.scheduledStartTime)
        );

        return {
          scheduleId: resolvedSchedule.id,
          scheduleName: resolvedSchedule.name,
          scheduleCode: resolvedSchedule.code,
          isWorkingDay: true,
          precedenceSource,
          shifts: segments,
        };
      }
    }

    // Fallback to legacy ShiftService resolution if no schedule exists
    const legacyShifts = await ShiftService.getApplicableShiftsForEmployee(tenantId, employeeId, date);
    return {
      scheduleId: resolvedSchedule?.id || 'default-schedule',
      scheduleName: resolvedSchedule?.name || 'Default General Schedule',
      scheduleCode: resolvedSchedule?.code || 'WS-GEN',
      isWorkingDay: legacyShifts.length > 0,
      precedenceSource: legacyShifts[0]?.precedenceSource || 'INSTITUTIONAL_DEFAULT',
      shifts: legacyShifts,
    };
  }
}
