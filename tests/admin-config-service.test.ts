import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminConfigService } from '../src/lib/services/admin-config-service';
import { prisma } from '../src/lib/db/prisma';

vi.mock('../src/lib/db/prisma', () => {
  const mockPrisma = {
    schoolProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    academicSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    classCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    schoolClass: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    section: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subject: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    classSubject: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };

  return { prisma: mockPrisma };
});

describe('AdminConfigService Unit & Integration Tests', () => {
  const tenantId = 'tenant-sch-001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('School Profile', () => {
    it('returns existing school profile', async () => {
      const mockProfile = { id: 'prof-1', tenantId, nameEn: 'Greenwood High' };
      vi.mocked(prisma.schoolProfile.findUnique).mockResolvedValue(mockProfile as any);

      const result = await AdminConfigService.getSchoolProfile(tenantId);
      expect(result).toEqual(mockProfile);
      expect(prisma.schoolProfile.findUnique).toHaveBeenCalledWith({ where: { tenantId } });
    });

    it('creates default profile if not present', async () => {
      vi.mocked(prisma.schoolProfile.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ id: tenantId, name: 'Default School', code: 'SCH-001' } as any);
      vi.mocked(prisma.schoolProfile.create).mockResolvedValue({ id: 'prof-new', tenantId, nameEn: 'Default School' } as any);

      const result = await AdminConfigService.getSchoolProfile(tenantId);
      expect(result.id).toBe('prof-new');
      expect(prisma.schoolProfile.create).toHaveBeenCalled();
    });
  });

  describe('Academic Sessions', () => {
    it('rejects academic session with startDate >= endDate', async () => {
      await expect(
        AdminConfigService.createAcademicSession(tenantId, {
          name: '2026-2027',
          code: 'SESS-26',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-01-01'),
        })
      ).rejects.toThrow('Start date must be strictly before end date');
    });

    it('unsets existing current sessions when setting a new current session', async () => {
      vi.mocked(prisma.academicSession.create).mockResolvedValue({
        id: 'sess-1',
        tenantId,
        name: '2026-2027',
        isCurrent: true,
      } as any);

      await AdminConfigService.createAcademicSession(tenantId, {
        name: '2026-2027',
        code: 'SESS-26',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        isCurrent: true,
      });

      expect(prisma.academicSession.updateMany).toHaveBeenCalledWith({
        where: { tenantId, isCurrent: true },
        data: { isCurrent: false },
      });
    });

    it('prevents modifying a LOCKED historical academic session', async () => {
      vi.mocked(prisma.academicSession.findUnique).mockResolvedValue({
        id: 'sess-locked',
        tenantId,
        status: 'LOCKED',
      } as any);

      await expect(
        AdminConfigService.updateAcademicSession(tenantId, 'sess-locked', {
          name: 'New Name',
        })
      ).rejects.toThrow('Cannot modify a LOCKED historical academic session');
    });
  });

  describe('School Classes & Cross-Tenant Protection', () => {
    it('rejects linking a class category belonging to another tenant', async () => {
      vi.mocked(prisma.classCategory.findUnique).mockResolvedValue({
        id: 'cat-foreign',
        tenantId: 'other-tenant',
      } as any);

      await expect(
        AdminConfigService.createSchoolClass(tenantId, {
          name: 'Grade 10',
          code: 'G10',
          classCategoryId: 'cat-foreign',
        })
      ).rejects.toThrow('Invalid Class Category for this tenant');
    });
  });

  describe('Subjects Master & Types Validation', () => {
    it('validates allowed subject types', async () => {
      await expect(
        AdminConfigService.createSubject(tenantId, {
          name: 'Robotics',
          code: 'ROB-01',
          subjectType: 'INVALID_TYPE' as any,
        })
      ).rejects.toThrow('Subject type must be one of: THEORY, PRACTICAL, BOTH, ACTIVITY');
    });

    it('creates a valid subject with audit logging', async () => {
      const mockCreated = {
        id: 'sub-1',
        tenantId,
        name: 'Mathematics',
        code: 'SUB-MTH',
        subjectType: 'THEORY',
        sortOrder: 10,
        isActive: true,
      };
      vi.mocked(prisma.subject.create).mockResolvedValue(mockCreated as any);

      const result = await AdminConfigService.createSubject(
        tenantId,
        {
          name: 'Mathematics',
          code: 'SUB-MTH',
          subjectType: 'THEORY',
          sortOrder: 10,
        },
        'usr-admin-01'
      );

      expect(result).toEqual(mockCreated);
      expect(prisma.subject.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          name: 'Mathematics',
          code: 'SUB-MTH',
          shortName: undefined,
          subjectType: 'THEORY',
          description: undefined,
          sortOrder: 10,
          isActive: true,
        },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          userId: 'usr-admin-01',
          entityType: 'SUBJECT',
          action: 'CREATE',
        }),
      });
    });

    it('updates subject and logs audit', async () => {
      const existing = { id: 'sub-1', tenantId, name: 'Physics', code: 'SUB-PHY' };
      const updated = { id: 'sub-1', tenantId, name: 'Physics & Lab', code: 'SUB-PHY' };
      vi.mocked(prisma.subject.findUnique).mockResolvedValue(existing as any);
      vi.mocked(prisma.subject.update).mockResolvedValue(updated as any);

      const result = await AdminConfigService.updateSubject(
        tenantId,
        'sub-1',
        { name: 'Physics & Lab' },
        'usr-admin-01'
      );

      expect(result).toEqual(updated);
      expect(prisma.subject.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { name: 'Physics & Lab' },
      });
    });
  });

  describe('Class-Subject Curriculum Mapping', () => {
    it('upserts curriculum assignments per session and class', async () => {
      vi.mocked(prisma.academicSession.findUnique).mockResolvedValue({
        id: 'sess-1',
        tenantId,
        status: 'ACTIVE',
      } as any);
      vi.mocked(prisma.schoolClass.findUnique).mockResolvedValue({
        id: 'cls-1',
        tenantId,
        name: 'Grade 9',
      } as any);
      vi.mocked(prisma.classSubject.upsert).mockResolvedValue({ id: 'cs-1' } as any);

      const results = await AdminConfigService.assignClassSubjects(
        tenantId,
        'sess-1',
        'cls-1',
        [{ subjectId: 'sub-1', isCompulsory: true, sortOrder: 10 }],
        'usr-admin-01'
      );

      expect(results).toHaveLength(1);
      expect(prisma.classSubject.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_academicSessionId_classId_subjectId: {
            tenantId,
            academicSessionId: 'sess-1',
            classId: 'cls-1',
            subjectId: 'sub-1',
          },
        },
        update: { isCompulsory: true, sortOrder: 10, isActive: true },
        create: {
          tenantId,
          academicSessionId: 'sess-1',
          classId: 'cls-1',
          subjectId: 'sub-1',
          isCompulsory: true,
          sortOrder: 10,
          isActive: true,
        },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          entityType: 'CLASS_SUBJECT',
          action: 'BULK_ASSIGN',
        }),
      });
    });

    it('rejects assigning subjects to a LOCKED academic session', async () => {
      vi.mocked(prisma.academicSession.findUnique).mockResolvedValue({
        id: 'sess-locked',
        tenantId,
        status: 'LOCKED',
      } as any);

      await expect(
        AdminConfigService.assignClassSubjects(tenantId, 'sess-locked', 'cls-1', [
          { subjectId: 'sub-1' },
        ])
      ).rejects.toThrow('Cannot modify subject assignments in a LOCKED academic session');
    });

    it('updates single class-subject requirement mapping', async () => {
      const existing = {
        id: 'cs-1',
        tenantId,
        isCompulsory: true,
        academicSession: { status: 'ACTIVE' },
        subject: { name: 'Mathematics' },
        schoolClass: { name: 'Grade 9 Science' },
      };
      const updated = {
        id: 'cs-1',
        tenantId,
        isCompulsory: false,
      };
      vi.mocked(prisma.classSubject.findUnique).mockResolvedValue(existing as any);
      vi.mocked(prisma.classSubject.update).mockResolvedValue(updated as any);

      const result = await AdminConfigService.updateClassSubject(
        tenantId,
        'cs-1',
        { isCompulsory: false },
        'usr-admin-01'
      );

      expect(result.isCompulsory).toBe(false);
      expect(prisma.classSubject.update).toHaveBeenCalledWith({
        where: { id: 'cs-1' },
        data: { isCompulsory: false },
      });
    });
  });
});
