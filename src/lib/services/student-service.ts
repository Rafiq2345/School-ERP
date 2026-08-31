import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';

export interface StudentFilterParams {
  sessionId?: string;
  classId?: string;
  sectionId?: string;
  categoryId?: string;
  houseId?: string;
  status?: string;
  gender?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateStudentDTO {
  admissionNo?: string;
  registrationNo?: string;
  firstNameEn: string;
  lastNameEn?: string;
  fullNameUr?: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string | Date;
  bloodGroup?: string;
  religion?: string;
  nationality?: string;
  nationalId?: string;
  photoUrl?: string;
  admissionDate?: string | Date;
  admissionSessionId: string;
  classId: string;
  sectionId: string;
  rollNumber?: string;
  categoryId?: string;
  houseId?: string;
  primaryContactPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  currentAddressEn?: string;
  currentAddressUr?: string;
  permanentAddressEn?: string;
  city?: string;
  customFieldValues?: Record<string, any>;
  notes?: string;
  // Guardian / Parent details
  existingGuardianId?: string;
  guardian?: {
    fullNameEn: string;
    fullNameUr?: string;
    nationalId?: string;
    relationshipType: 'FATHER' | 'MOTHER' | 'GUARDIAN';
    occupation?: string;
    employer?: string;
    primaryPhone: string;
    email?: string;
    annualIncome?: number;
    residentialAddress?: string;
  };
  // Previous School details
  previousSchool?: {
    schoolName: string;
    lastClassPassed: string;
    boardOrInstitute?: string;
    slcNumber?: string;
    slcIssueDate?: string | Date;
    percentageOrGpa?: number;
    remarks?: string;
  };
}

export class StudentService {
  /**
   * Generates or increments admission sequence number for a tenant.
   */
  public static async generateNextAdmissionNumber(tenantId: string, sessionId?: string): Promise<string> {
    let seq = await prisma.documentSequence.findFirst({
      where: { tenantId, moduleCode: 'STUDENTS', documentType: 'ADMISSION_NO' },
    });

    if (!seq) {
      seq = await prisma.documentSequence.create({
        data: {
          tenantId,
          moduleCode: 'STUDENTS',
          documentType: 'ADMISSION_NO',
          prefix: 'ADM-',
          suffix: '',
          startingNumber: 1001,
          currentNumber: 1000,
          paddingLength: 4,
          resetPolicy: 'NEVER',
          academicSessionId: sessionId || null,
        },
      });
    }

    const nextNum = seq.currentNumber + 1;
    await prisma.documentSequence.update({
      where: { id: seq.id },
      data: { currentNumber: nextNum },
    });

    const padded = String(nextNum).padStart(seq.paddingLength, '0');
    return `${seq.prefix || ''}${padded}${seq.suffix || ''}`;
  }

  /**
   * List students with filtering, search, and pagination.
   */
  public static async getStudents(tenantId: string, params: StudentFilterParams) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const skip = (page - 1) * pageSize;

    const where: Prisma.StudentWhereInput = { tenantId };

    if (params.status) {
      where.currentStatus = params.status;
    }
    if (params.gender) {
      where.gender = params.gender;
    }
    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }
    if (params.houseId) {
      where.houseId = params.houseId;
    }

    // Enrollment filters (Class / Section / Session)
    if (params.sessionId || params.classId || params.sectionId) {
      where.enrollments = {
        some: {
          tenantId,
          isCurrent: true,
          ...(params.sessionId ? { academicSessionId: params.sessionId } : {}),
          ...(params.classId ? { classId: params.classId } : {}),
          ...(params.sectionId ? { sectionId: params.sectionId } : {}),
        },
      };
    }

    // Search query
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { admissionNo: { contains: q, mode: 'insensitive' } },
        { firstNameEn: { contains: q, mode: 'insensitive' } },
        { lastNameEn: { contains: q, mode: 'insensitive' } },
        { nationalId: { contains: q, mode: 'insensitive' } },
        { primaryContactPhone: { contains: q, mode: 'insensitive' } },
        {
          guardians: {
            some: {
              guardian: { fullNameEn: { contains: q, mode: 'insensitive' } },
            },
          },
        },
      ];
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          category: true,
          house: true,
          admissionSession: true,
          enrollments: {
            where: { isCurrent: true },
            include: {
              schoolClass: true,
              section: true,
              academicSession: true,
            },
            take: 1,
          },
          guardians: {
            include: { guardian: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      data: students.map((s) => {
        const currentEnrollment = s.enrollments[0] || null;
        const primaryGuardian = s.guardians.find((g) => g.isPrimaryContact)?.guardian || s.guardians[0]?.guardian || null;

        return {
          id: s.id,
          admissionNo: s.admissionNo,
          registrationNo: s.registrationNo,
          nameEn: `${s.firstNameEn}${s.lastNameEn ? ' ' + s.lastNameEn : ''}`,
          fullNameUr: s.fullNameUr,
          gender: s.gender,
          dob: s.dob,
          photoUrl: s.photoUrl,
          nationalId: s.nationalId,
          primaryContactPhone: s.primaryContactPhone,
          currentStatus: s.currentStatus,
          category: s.category ? { id: s.category.id, name: s.category.name, code: s.category.code } : null,
          house: s.house ? { id: s.house.id, name: s.house.name, color: s.house.color } : null,
          currentEnrollment: currentEnrollment
            ? {
                id: currentEnrollment.id,
                sessionName: currentEnrollment.academicSession.name,
                className: currentEnrollment.schoolClass.name,
                sectionName: currentEnrollment.section.name,
                rollNumber: currentEnrollment.rollNumber,
              }
            : null,
          guardianName: primaryGuardian ? primaryGuardian.fullNameEn : null,
          guardianPhone: primaryGuardian ? primaryGuardian.primaryPhone : null,
          createdAt: s.createdAt,
        };
      }),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Returns comprehensive Student 360 profile with enrollments, siblings, family, documents, and audit timeline.
   */
  public static async getStudentById(tenantId: string, studentId: string) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId },
      include: {
        category: true,
        house: true,
        admissionSession: true,
        enrollments: {
          include: {
            schoolClass: true,
            section: true,
            academicSession: true,
          },
          orderBy: { enrollmentDate: 'desc' },
        },
        guardians: {
          include: {
            guardian: {
              include: {
                students: {
                  where: { studentId: { not: studentId } },
                  include: {
                    student: {
                      include: {
                        enrollments: {
                          where: { isCurrent: true },
                          include: { schoolClass: true, section: true },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        statusHistories: {
          include: { changedBy: { select: { username: true } } },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        previousSchools: true,
      },
    });

    if (!student) {
      throw new Error('Student record not found.');
    }

    // Extract siblings linked via shared guardians
    const siblingMap = new Map<string, any>();
    for (const rel of student.guardians) {
      for (const sibRel of rel.guardian.students) {
        if (sibRel.student && !siblingMap.has(sibRel.student.id)) {
          const cur = sibRel.student.enrollments[0];
          siblingMap.set(sibRel.student.id, {
            id: sibRel.student.id,
            admissionNo: sibRel.student.admissionNo,
            nameEn: `${sibRel.student.firstNameEn}${sibRel.student.lastNameEn ? ' ' + sibRel.student.lastNameEn : ''}`,
            gender: sibRel.student.gender,
            currentStatus: sibRel.student.currentStatus,
            className: cur ? cur.schoolClass.name : null,
            sectionName: cur ? cur.section.name : null,
          });
        }
      }
    }

    // Audit trail entries for this student
    const auditLogs = await prisma.auditLog.findMany({
      where: { tenantId, entityType: 'STUDENT', entityId: studentId },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    return {
      ...student,
      siblings: Array.from(siblingMap.values()),
      auditLogs,
    };
  }

  /**
   * Creates a new Student with guardian linkage, initial enrollment, and status history.
   */
  public static async createStudent(tenantId: string, data: CreateStudentDTO, userId?: string) {
    // 1. Generate Admission Number if not provided
    const admissionNo = data.admissionNo && data.admissionNo.trim()
      ? data.admissionNo.trim()
      : await this.generateNextAdmissionNumber(tenantId, data.admissionSessionId);

    // 2. Validate Class & Section exist
    const section = await prisma.section.findFirst({
      where: { id: data.sectionId, classId: data.classId, tenantId },
    });
    if (!section) {
      throw new Error('Specified Section does not belong to the selected Class.');
    }

    // 3. Resolve or Create Guardian (Sibling Linkage)
    let guardianId = data.existingGuardianId;

    if (!guardianId && data.guardian) {
      // Auto-search existing parent by National ID (CNIC) or Primary Phone
      let existing = null;
      if (data.guardian.nationalId) {
        existing = await prisma.guardian.findFirst({
          where: { tenantId, nationalId: data.guardian.nationalId },
        });
      }
      if (!existing && data.guardian.primaryPhone) {
        existing = await prisma.guardian.findFirst({
          where: { tenantId, primaryPhone: data.guardian.primaryPhone },
        });
      }

      if (existing) {
        guardianId = existing.id;
      } else {
        const createdGuardian = await prisma.guardian.create({
          data: {
            tenantId,
            fullNameEn: data.guardian.fullNameEn,
            fullNameUr: data.guardian.fullNameUr || null,
            nationalId: data.guardian.nationalId || null,
            relationshipType: data.guardian.relationshipType,
            occupation: data.guardian.occupation || null,
            employer: data.guardian.employer || null,
            primaryPhone: data.guardian.primaryPhone,
            email: data.guardian.email || null,
            annualIncome: data.guardian.annualIncome ? Number(data.guardian.annualIncome) : null,
            residentialAddress: data.guardian.residentialAddress || null,
          },
        });
        guardianId = createdGuardian.id;
      }
    }

    // 4. Create Student Master in Transaction
    const newStudent = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          tenantId,
          admissionNo,
          registrationNo: data.registrationNo || null,
          firstNameEn: data.firstNameEn,
          lastNameEn: data.lastNameEn || null,
          fullNameUr: data.fullNameUr || null,
          gender: data.gender,
          dob: new Date(data.dob),
          bloodGroup: data.bloodGroup || 'UNKNOWN',
          religion: data.religion || 'ISLAM',
          nationality: data.nationality || 'PAKISTANI',
          nationalId: data.nationalId || null,
          photoUrl: data.photoUrl || null,
          admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
          admissionSessionId: data.admissionSessionId,
          categoryId: data.categoryId || null,
          houseId: data.houseId || null,
          primaryContactPhone: data.primaryContactPhone || (data.guardian ? data.guardian.primaryPhone : null),
          emergencyContactName: data.emergencyContactName || null,
          emergencyContactPhone: data.emergencyContactPhone || null,
          currentAddressEn: data.currentAddressEn || null,
          currentAddressUr: data.currentAddressUr || null,
          permanentAddressEn: data.permanentAddressEn || null,
          city: data.city || 'Karachi',
          currentStatus: 'ACTIVE',
          customFieldValues: data.customFieldValues ? (data.customFieldValues as Prisma.InputJsonValue) : undefined,
          notes: data.notes || null,
        },
      });

      // Link Guardian if present
      if (guardianId) {
        await tx.studentGuardianRelation.create({
          data: {
            tenantId,
            studentId: student.id,
            guardianId,
            relationship: data.guardian ? data.guardian.relationshipType : 'FATHER',
            isPrimaryContact: true,
            isEmergencyContact: true,
            isFinancialResponsible: true,
            hasPortalAccess: true,
          },
        });
      }

      // Create Initial Enrollment
      await tx.studentEnrollment.create({
        data: {
          tenantId,
          studentId: student.id,
          academicSessionId: data.admissionSessionId,
          classId: data.classId,
          sectionId: data.sectionId,
          rollNumber: data.rollNumber || null,
          enrollmentDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
          enrollmentType: 'NEW_ADMISSION',
          status: 'ACTIVE',
          isCurrent: true,
        },
      });

      // Check if valid user exists for foreign key
      let validUserId: string | null = null;
      if (userId) {
        const userExists = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (userExists) validUserId = userExists.id;
      }

      // Initial Status History Entry
      await tx.studentStatusHistory.create({
        data: {
          tenantId,
          studentId: student.id,
          previousStatus: 'NEW_ADMISSION',
          newStatus: 'ACTIVE',
          reason: 'Initial student admission and enrollment',
          effectiveDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
          changedByUserId: validUserId,
        },
      });

      // Previous School if provided
      if (data.previousSchool && data.previousSchool.schoolName) {
        await tx.studentPreviousSchool.create({
          data: {
            tenantId,
            studentId: student.id,
            schoolName: data.previousSchool.schoolName,
            lastClassPassed: data.previousSchool.lastClassPassed,
            boardOrInstitute: data.previousSchool.boardOrInstitute || null,
            slcNumber: data.previousSchool.slcNumber || null,
            slcIssueDate: data.previousSchool.slcIssueDate ? new Date(data.previousSchool.slcIssueDate) : null,
            percentageOrGpa: data.previousSchool.percentageOrGpa ? Number(data.previousSchool.percentageOrGpa) : null,
            remarks: data.previousSchool.remarks || null,
          },
        });
      }

      return student;
    });

    // Audit Log Entry
    if (userId) {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            module: 'STUDENTS',
            entityType: 'STUDENT',
            entityId: newStudent.id,
            action: 'CREATE',
            newValues: { admissionNo, name: newStudent.firstNameEn, classId: data.classId },
            changeSummary: `Admitted student: ${newStudent.firstNameEn} (Admission #${admissionNo})`,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return newStudent;
  }

  /**
   * Updates student personal and contact details.
   */
  public static async updateStudent(tenantId: string, studentId: string, data: Partial<CreateStudentDTO>, userId?: string) {
    const existing = await prisma.student.findFirst({
      where: { id: studentId, tenantId },
    });
    if (!existing) {
      throw new Error('Student not found.');
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        firstNameEn: data.firstNameEn !== undefined ? data.firstNameEn : existing.firstNameEn,
        lastNameEn: data.lastNameEn !== undefined ? data.lastNameEn : existing.lastNameEn,
        fullNameUr: data.fullNameUr !== undefined ? data.fullNameUr : existing.fullNameUr,
        gender: data.gender !== undefined ? data.gender : existing.gender,
        dob: data.dob ? new Date(data.dob) : existing.dob,
        bloodGroup: data.bloodGroup !== undefined ? data.bloodGroup : existing.bloodGroup,
        religion: data.religion !== undefined ? data.religion : existing.religion,
        nationality: data.nationality !== undefined ? data.nationality : existing.nationality,
        nationalId: data.nationalId !== undefined ? data.nationalId : existing.nationalId,
        photoUrl: data.photoUrl !== undefined ? data.photoUrl : existing.photoUrl,
        categoryId: data.categoryId !== undefined ? data.categoryId : existing.categoryId,
        houseId: data.houseId !== undefined ? data.houseId : existing.houseId,
        primaryContactPhone: data.primaryContactPhone !== undefined ? data.primaryContactPhone : existing.primaryContactPhone,
        emergencyContactName: data.emergencyContactName !== undefined ? data.emergencyContactName : existing.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone !== undefined ? data.emergencyContactPhone : existing.emergencyContactPhone,
        currentAddressEn: data.currentAddressEn !== undefined ? data.currentAddressEn : existing.currentAddressEn,
        currentAddressUr: data.currentAddressUr !== undefined ? data.currentAddressUr : existing.currentAddressUr,
        permanentAddressEn: data.permanentAddressEn !== undefined ? data.permanentAddressEn : existing.permanentAddressEn,
        city: data.city !== undefined ? data.city : existing.city,
        customFieldValues: data.customFieldValues !== undefined ? (data.customFieldValues as Prisma.InputJsonValue) : (existing.customFieldValues as Prisma.InputJsonValue | undefined),
        notes: data.notes !== undefined ? data.notes : existing.notes,
      },
    });

    if (userId) {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            module: 'STUDENTS',
            entityType: 'STUDENT',
            entityId: studentId,
            action: 'UPDATE',
            oldValues: existing,
            newValues: updated,
            changeSummary: `Updated student details for ${updated.firstNameEn} (${updated.admissionNo})`,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return updated;
  }

  /**
   * Search guardians by query string for sibling linkage.
   */
  public static async searchGuardians(tenantId: string, query: string) {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim();

    return prisma.guardian.findMany({
      where: {
        tenantId,
        OR: [
          { nationalId: { contains: q, mode: 'insensitive' } },
          { primaryPhone: { contains: q, mode: 'insensitive' } },
          { fullNameEn: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        students: {
          include: { student: { select: { id: true, admissionNo: true, firstNameEn: true, lastNameEn: true } } },
        },
      },
      take: 10,
    });
  }

  /**
   * Adds an official document attachment to the student profile.
   */
  public static async addStudentDocument(
    tenantId: string,
    studentId: string,
    data: {
      documentType: string;
      title: string;
      documentUrl: string;
      fileSize?: number;
      mimeType?: string;
    },
    userId?: string
  ) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId },
    });
    if (!student) throw new Error('Student record not found.');

    let validUserId: string | null = null;
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (userExists) validUserId = userExists.id;
    }

    const doc = await prisma.studentDocument.create({
      data: {
        tenantId,
        studentId,
        documentType: data.documentType,
        title: data.title.trim(),
        documentUrl: data.documentUrl.trim(),
        fileSize: data.fileSize || 1024 * 150,
        mimeType: data.mimeType || 'application/pdf',
        uploadedByUserId: validUserId,
      },
    });

    if (userId) {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            module: 'STUDENTS',
            entityType: 'STUDENT_DOCUMENT',
            entityId: doc.id,
            action: 'CREATE',
            changeSummary: `Uploaded document '${doc.title}' (${doc.documentType}) for student ${student.admissionNo}.`,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return doc;
  }

  /**
   * Returns dashboard summary statistics for students.
   */
  public static async getStudentSummaryStats(tenantId: string, sessionId?: string) {
    const [total, active, male, female] = await Promise.all([
      prisma.student.count({ where: { tenantId } }),
      prisma.student.count({ where: { tenantId, currentStatus: 'ACTIVE' } }),
      prisma.student.count({ where: { tenantId, currentStatus: 'ACTIVE', gender: 'MALE' } }),
      prisma.student.count({ where: { tenantId, currentStatus: 'ACTIVE', gender: 'FEMALE' } }),
    ]);

    return {
      total,
      active,
      male,
      female,
    };
  }
}
