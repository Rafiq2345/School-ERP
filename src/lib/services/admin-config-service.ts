import { prisma } from '@/lib/db/prisma';

export class AdminConfigService {
  private static async logAudit(params: {
    tenantId: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
    changeSummary: string;
  }) {
    if (!params.userId) return;
    try {
      if (prisma.auditLog?.create) {
        await prisma.auditLog.create({
          data: {
            tenantId: params.tenantId,
            userId: params.userId,
            module: 'SETTINGS',
            entityType: params.entityType,
            entityId: params.entityId,
            action: params.action,
            oldValues: params.oldValues || undefined,
            newValues: params.newValues || undefined,
            changeSummary: params.changeSummary,
          },
        });
      }
    } catch {
      // Non-blocking audit logging
    }
  }

  // 1. School Profile
  public static async getSchoolProfile(tenantId: string) {
    let profile = await prisma.schoolProfile.findUnique({
      where: { tenantId },
    });

    if (!profile) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      profile = await prisma.schoolProfile.create({
        data: {
          tenantId,
          nameEn: tenant?.name || 'School ERP Academy',
          nameUr: 'اسکول مینجمنٹ سسٹم',
          code: tenant?.code || 'SCH-001',
          currencySymbol: 'Rs.',
          currencyCode: 'PKR',
          timezone: 'Asia/Karachi',
          dateFormat: 'DD/MM/YYYY',
        },
      });
    }

    return profile;
  }

  public static async updateSchoolProfile(
    tenantId: string,
    data: {
      nameEn?: string;
      nameUr?: string;
      code?: string;
      registrationNo?: string | null;
      logoUrl?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      addressEn?: string | null;
      addressUr?: string | null;
      currencySymbol?: string;
      currencyCode?: string;
      timezone?: string;
      dateFormat?: string;
      isActive?: boolean;
    },
    userId?: string
  ) {
    const existing = await this.getSchoolProfile(tenantId);

    const updated = await prisma.schoolProfile.update({
      where: { tenantId },
      data,
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      entityType: 'SCHOOL_PROFILE',
      entityId: updated.id,
      oldValues: existing,
      newValues: updated,
      changeSummary: `Updated School Profile: ${updated.nameEn}`,
    });

    return updated;
  }

  // 2. Academic Sessions
  public static async getAcademicSessions(
    tenantId: string,
    params?: { search?: string; status?: string }
  ) {
    return prisma.academicSession.findMany({
      where: {
        tenantId,
        ...(params?.status ? { status: params.status as any } : {}),
        ...(params?.search
          ? {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { code: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
      include: {
        _count: {
          select: {
            classSubjects: true,
            calendarEvents: true,
          },
        },
      },
    });
  }

  public static async createAcademicSession(
    tenantId: string,
    data: {
      name: string;
      code: string;
      startDate: Date;
      endDate: Date;
      isCurrent?: boolean;
      status?: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'LOCKED';
    },
    userId?: string
  ) {
    if (data.startDate >= data.endDate) {
      throw new Error('Start date must be strictly before end date');
    }

    return prisma.$transaction(async (tx) => {
      if (data.isCurrent) {
        await tx.academicSession.updateMany({
          where: { tenantId, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      const session = await tx.academicSession.create({
        data: {
          tenantId,
          name: data.name,
          code: data.code,
          startDate: data.startDate,
          endDate: data.endDate,
          isCurrent: data.isCurrent || false,
          status: data.status || 'DRAFT',
          createdByUserId: userId,
        },
      });

      await this.logAudit({
        tenantId,
        userId,
        action: 'CREATE',
        entityType: 'ACADEMIC_SESSION',
        entityId: session.id,
        newValues: session,
        changeSummary: `Created Academic Session: ${session.name} (${session.code})`,
      });

      return session;
    });
  }

  public static async updateAcademicSession(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      code?: string;
      startDate?: Date;
      endDate?: Date;
      isCurrent?: boolean;
      status?: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'LOCKED';
    },
    userId?: string
  ) {
    const existing = await prisma.academicSession.findUnique({
      where: { id },
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('Academic Session not found');
    }

    if (existing.status === 'LOCKED') {
      throw new Error('Cannot modify a LOCKED historical academic session');
    }

    if (data.startDate && data.endDate && data.startDate >= data.endDate) {
      throw new Error('Start date must be strictly before end date');
    }

    return prisma.$transaction(async (tx) => {
      if (data.isCurrent) {
        await tx.academicSession.updateMany({
          where: { tenantId, isCurrent: true, id: { not: id } },
          data: { isCurrent: false },
        });
      }

      const updated = await tx.academicSession.update({
        where: { id },
        data: {
          ...data,
          lockedAt: data.status === 'LOCKED' ? new Date() : existing.lockedAt,
          closedAt: data.status === 'CLOSED' ? new Date() : existing.closedAt,
          updatedByUserId: userId,
        },
      });

      await this.logAudit({
        tenantId,
        userId,
        action: 'UPDATE',
        entityType: 'ACADEMIC_SESSION',
        entityId: updated.id,
        oldValues: existing,
        newValues: updated,
        changeSummary: `Updated Academic Session: ${updated.name}`,
      });

      return updated;
    });
  }

  // 3. Class Categories
  public static async getClassCategories(
    tenantId: string,
    params?: { search?: string; isActive?: boolean }
  ) {
    return prisma.classCategory.findMany({
      where: {
        tenantId,
        ...(params?.isActive !== undefined ? { isActive: params.isActive } : {}),
        ...(params?.search
          ? {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { code: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { classes: true },
        },
      },
    });
  }

  public static async createClassCategory(
    tenantId: string,
    data: {
      name: string;
      code: string;
      sortOrder?: number;
      description?: string | null;
      isActive?: boolean;
    },
    userId?: string
  ) {
    const category = await prisma.classCategory.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        sortOrder: data.sortOrder ?? 0,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'CREATE',
      entityType: 'CLASS_CATEGORY',
      entityId: category.id,
      newValues: category,
      changeSummary: `Created Class Category: ${category.name}`,
    });

    return category;
  }

  public static async updateClassCategory(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      code?: string;
      sortOrder?: number;
      description?: string | null;
      isActive?: boolean;
    },
    userId?: string
  ) {
    const existing = await prisma.classCategory.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('Class Category not found');
    }

    const updated = await prisma.classCategory.update({
      where: { id },
      data,
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      entityType: 'CLASS_CATEGORY',
      entityId: updated.id,
      oldValues: existing,
      newValues: updated,
      changeSummary: `Updated Class Category: ${updated.name}`,
    });

    return updated;
  }

  // 4. School Classes
  public static async getSchoolClasses(
    tenantId: string,
    params?: { search?: string; classCategoryId?: string; isActive?: boolean }
  ) {
    return prisma.schoolClass.findMany({
      where: {
        tenantId,
        ...(params?.classCategoryId ? { classCategoryId: params.classCategoryId } : {}),
        ...(params?.isActive !== undefined ? { isActive: params.isActive } : {}),
        ...(params?.search
          ? {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { code: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        classCategory: true,
        _count: {
          select: {
            sections: true,
            classSubjects: true,
          },
        },
      },
    });
  }

  public static async createSchoolClass(
    tenantId: string,
    data: {
      name: string;
      code: string;
      classCategoryId?: string | null;
      sortOrder?: number;
      description?: string | null;
      isActive?: boolean;
    },
    userId?: string
  ) {
    if (data.classCategoryId) {
      const category = await prisma.classCategory.findUnique({
        where: { id: data.classCategoryId },
      });
      if (!category || category.tenantId !== tenantId) {
        throw new Error('Invalid Class Category for this tenant');
      }
    }

    const schoolClass = await prisma.schoolClass.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        classCategoryId: data.classCategoryId,
        sortOrder: data.sortOrder ?? 0,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'CREATE',
      entityType: 'SCHOOL_CLASS',
      entityId: schoolClass.id,
      newValues: schoolClass,
      changeSummary: `Created School Class: ${schoolClass.name}`,
    });

    return schoolClass;
  }

  public static async updateSchoolClass(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      code?: string;
      classCategoryId?: string | null;
      sortOrder?: number;
      description?: string | null;
      isActive?: boolean;
    },
    userId?: string
  ) {
    const existing = await prisma.schoolClass.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('School Class not found');
    }

    if (data.classCategoryId) {
      const category = await prisma.classCategory.findUnique({
        where: { id: data.classCategoryId },
      });
      if (!category || category.tenantId !== tenantId) {
        throw new Error('Invalid Class Category for this tenant');
      }
    }

    const updated = await prisma.schoolClass.update({
      where: { id },
      data,
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      entityType: 'SCHOOL_CLASS',
      entityId: updated.id,
      oldValues: existing,
      newValues: updated,
      changeSummary: `Updated School Class: ${updated.name}`,
    });

    return updated;
  }

  // 5. Sections
  public static async getSections(
    tenantId: string,
    params?: { search?: string; classId?: string; isActive?: boolean }
  ) {
    return prisma.section.findMany({
      where: {
        tenantId,
        ...(params?.classId ? { classId: params.classId } : {}),
        ...(params?.isActive !== undefined ? { isActive: params.isActive } : {}),
        ...(params?.search
          ? {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { code: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        schoolClass: true,
      },
    });
  }

  public static async createSection(
    tenantId: string,
    data: {
      classId: string;
      name: string;
      code: string;
      capacity?: number | null;
      sortOrder?: number;
      isActive?: boolean;
    },
    userId?: string
  ) {
    const schoolClass = await prisma.schoolClass.findUnique({
      where: { id: data.classId },
    });
    if (!schoolClass || schoolClass.tenantId !== tenantId) {
      throw new Error('Invalid School Class for this tenant');
    }

    const section = await prisma.section.create({
      data: {
        tenantId,
        classId: data.classId,
        name: data.name,
        code: data.code,
        capacity: data.capacity,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'CREATE',
      entityType: 'SECTION',
      entityId: section.id,
      newValues: section,
      changeSummary: `Created Section: ${section.name} (${schoolClass.name})`,
    });

    return section;
  }

  public static async updateSection(
    tenantId: string,
    id: string,
    data: {
      classId?: string;
      name?: string;
      code?: string;
      capacity?: number | null;
      sortOrder?: number;
      isActive?: boolean;
    },
    userId?: string
  ) {
    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('Section not found');
    }

    if (data.classId) {
      const schoolClass = await prisma.schoolClass.findUnique({
        where: { id: data.classId },
      });
      if (!schoolClass || schoolClass.tenantId !== tenantId) {
        throw new Error('Invalid School Class for this tenant');
      }
    }

    const updated = await prisma.section.update({
      where: { id },
      data,
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      entityType: 'SECTION',
      entityId: updated.id,
      oldValues: existing,
      newValues: updated,
      changeSummary: `Updated Section: ${updated.name}`,
    });

    return updated;
  }

  // 6. Subjects
  public static async getSubjects(
    tenantId: string,
    params?: {
      search?: string;
      subjectType?: 'THEORY' | 'PRACTICAL' | 'BOTH' | 'ACTIVITY';
      isActive?: boolean;
    }
  ) {
    return prisma.subject.findMany({
      where: {
        tenantId,
        ...(params?.subjectType ? { subjectType: params.subjectType } : {}),
        ...(params?.isActive !== undefined ? { isActive: params.isActive } : {}),
        ...(params?.search
          ? {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { code: { contains: params.search, mode: 'insensitive' } },
                { shortName: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { classSubjects: true },
        },
      },
    });
  }

  public static async createSubject(
    tenantId: string,
    data: {
      name: string;
      code: string;
      shortName?: string | null;
      subjectType?: 'THEORY' | 'PRACTICAL' | 'BOTH' | 'ACTIVITY';
      description?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
    userId?: string
  ) {
    const validTypes = ['THEORY', 'PRACTICAL', 'BOTH', 'ACTIVITY'];
    if (data.subjectType && !validTypes.includes(data.subjectType)) {
      throw new Error(`Subject type must be one of: ${validTypes.join(', ')}`);
    }

    const subject = await prisma.subject.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        shortName: data.shortName,
        subjectType: data.subjectType || 'THEORY',
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'CREATE',
      entityType: 'SUBJECT',
      entityId: subject.id,
      newValues: subject,
      changeSummary: `Created Subject: ${subject.name} (${subject.code})`,
    });

    return subject;
  }

  public static async updateSubject(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      code?: string;
      shortName?: string | null;
      subjectType?: 'THEORY' | 'PRACTICAL' | 'BOTH' | 'ACTIVITY';
      description?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
    userId?: string
  ) {
    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('Subject not found');
    }

    const updated = await prisma.subject.update({
      where: { id },
      data,
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      entityType: 'SUBJECT',
      entityId: updated.id,
      oldValues: existing,
      newValues: updated,
      changeSummary: `Updated Subject: ${updated.name}`,
    });

    return updated;
  }

    // 7. Class-Subject Mapping
  public static async getClassSubjects(
    tenantId: string,
    params?: {
      academicSessionId?: string;
      classId?: string;
      isActive?: boolean;
    }
  ) {
    return prisma.classSubject.findMany({
      where: {
        tenantId,
        ...(params?.academicSessionId ? { academicSessionId: params.academicSessionId } : {}),
        ...(params?.classId ? { classId: params.classId } : {}),
        ...(params?.isActive !== undefined ? { isActive: params.isActive } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        academicSession: true,
        schoolClass: true,
        subject: true,
      },
    });
  }

  public static async assignClassSubjects(
    tenantId: string,
    academicSessionId: string,
    classId: string,
    assignments: { subjectId: string; isCompulsory?: boolean; sortOrder?: number }[],
    userId?: string
  ) {
    const session = await prisma.academicSession.findUnique({ where: { id: academicSessionId } });
    if (!session || session.tenantId !== tenantId) {
      throw new Error('Academic Session not found');
    }
    if (session.status === 'LOCKED') {
      throw new Error('Cannot modify subject assignments in a LOCKED academic session');
    }

    const schoolClass = await prisma.schoolClass.findUnique({ where: { id: classId } });
    if (!schoolClass || schoolClass.tenantId !== tenantId) {
      throw new Error('School Class not found');
    }

    const activeSubjectIds = assignments.map((a) => a.subjectId);

    return prisma.$transaction(async (tx) => {
      // 1. Remove mappings that were unselected in this batch
      await tx.classSubject.deleteMany({
        where: {
          tenantId,
          academicSessionId,
          classId,
          subjectId: { notIn: activeSubjectIds },
        },
      });

      // 2. Upsert active assignments
      const results = [];
      for (const item of assignments) {
        const mapped = await tx.classSubject.upsert({
          where: {
            tenantId_academicSessionId_classId_subjectId: {
              tenantId,
              academicSessionId,
              classId,
              subjectId: item.subjectId,
            },
          },
          update: {
            isCompulsory: item.isCompulsory !== undefined ? item.isCompulsory : true,
            sortOrder: item.sortOrder ?? 0,
            isActive: true,
          },
          create: {
            tenantId,
            academicSessionId,
            classId,
            subjectId: item.subjectId,
            isCompulsory: item.isCompulsory !== undefined ? item.isCompulsory : true,
            sortOrder: item.sortOrder ?? 0,
            isActive: true,
          },
        });
        results.push(mapped);
      }

      await this.logAudit({
        tenantId,
        userId,
        action: 'BULK_ASSIGN',
        entityType: 'CLASS_SUBJECT',
        entityId: `${academicSessionId}_${classId}`,
        changeSummary: `Assigned ${assignments.length} subjects to ${schoolClass.name} for ${session.name}`,
      });

      return results;
    });
  }

  public static async updateClassSubject(
    tenantId: string,
    id: string,
    data: {
      isCompulsory?: boolean;
      sortOrder?: number;
      isActive?: boolean;
    },
    userId?: string
  ) {
    const existing = await prisma.classSubject.findUnique({
      where: { id },
      include: { academicSession: true, subject: true, schoolClass: true },
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('Class Subject mapping not found');
    }

    if (existing.academicSession.status === 'LOCKED') {
      throw new Error('Cannot modify subject assignments in a LOCKED academic session');
    }

    const updated = await prisma.classSubject.update({
      where: { id },
      data,
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      entityType: 'CLASS_SUBJECT',
      entityId: updated.id,
      oldValues: existing,
      newValues: updated,
      changeSummary: `Updated subject assignment mapping for ${existing.subject.name} in ${existing.schoolClass.name}`,
    });

    return updated;
  }

  public static async deleteClassSubject(tenantId: string, id: string, userId?: string) {
    const existing = await prisma.classSubject.findUnique({
      where: { id },
      include: { academicSession: true, subject: true, schoolClass: true },
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('Class Subject mapping not found');
    }

    if (existing.academicSession.status === 'LOCKED') {
      throw new Error('Cannot modify subject assignments in a LOCKED academic session');
    }

    const deleted = await prisma.classSubject.delete({
      where: { id },
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'DELETE',
      entityType: 'CLASS_SUBJECT',
      entityId: id,
      oldValues: existing,
      changeSummary: `Removed subject ${existing.subject.name} from class ${existing.schoolClass.name}`,
    });

    return deleted;
  }
}
