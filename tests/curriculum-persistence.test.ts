import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminConfigService } from '../src/lib/services/admin-config-service';
import { prisma } from '../src/lib/db/prisma';

vi.mock('../src/lib/db/prisma', () => {
  const mockPrisma = {
    academicSession: {
      findUnique: vi.fn(),
    },
    schoolClass: {
      findUnique: vi.fn(),
    },
    classSubject: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };

  return { prisma: mockPrisma };
});

describe('Class-Subject Curriculum Mapping Persistence Regression Tests', () => {
  const tenantId = 'tenant-sch-001';
  const academicSessionId = 'sess-2026-01';
  const classId = 'cls-grade-9';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns subjects, persists to database, and retrieves the exact same mapping on reload', async () => {
    // 1. Mock session and class lookup
    vi.mocked(prisma.academicSession.findUnique).mockResolvedValue({
      id: academicSessionId,
      tenantId,
      name: 'Academic Year 2026-2027',
      status: 'ACTIVE',
    } as any);

    vi.mocked(prisma.schoolClass.findUnique).mockResolvedValue({
      id: classId,
      tenantId,
      name: 'Grade 9 Science',
    } as any);

    const savedRecords = [
      {
        id: 'cs-1',
        tenantId,
        academicSessionId,
        classId,
        subjectId: 'sub-math',
        isCompulsory: true,
        sortOrder: 10,
        isActive: true,
      },
      {
        id: 'cs-2',
        tenantId,
        academicSessionId,
        classId,
        subjectId: 'sub-physics',
        isCompulsory: false,
        sortOrder: 20,
        isActive: true,
      },
    ];

    vi.mocked(prisma.classSubject.upsert)
      .mockResolvedValueOnce(savedRecords[0] as any)
      .mockResolvedValueOnce(savedRecords[1] as any);

    // 2. Perform bulk assignment
    const assigned = await AdminConfigService.assignClassSubjects(
      tenantId,
      academicSessionId,
      classId,
      [
        { subjectId: 'sub-math', isCompulsory: true, sortOrder: 10 },
        { subjectId: 'sub-physics', isCompulsory: false, sortOrder: 20 },
      ],
      'usr-admin-01'
    );

    expect(assigned).toHaveLength(2);
    expect(prisma.classSubject.deleteMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        academicSessionId,
        classId,
        subjectId: { notIn: ['sub-math', 'sub-physics'] },
      },
    });

    // 3. Simulate browser refresh / page reload query using the exact same session + class
    vi.mocked(prisma.classSubject.findMany).mockResolvedValue(savedRecords as any);

    const reloaded = await AdminConfigService.getClassSubjects(tenantId, {
      academicSessionId,
      classId,
    });

    expect(reloaded).toHaveLength(2);
    expect(reloaded[0].subjectId).toBe('sub-math');
    expect(reloaded[0].isCompulsory).toBe(true);
    expect(reloaded[1].subjectId).toBe('sub-physics');
    expect(reloaded[1].isCompulsory).toBe(false);
  });

  it('removes subject mapping via deleteClassSubject with audit trail', async () => {
    const existing = {
      id: 'cs-1',
      tenantId,
      academicSessionId,
      classId,
      subjectId: 'sub-math',
      academicSession: { status: 'ACTIVE' },
      subject: { name: 'Mathematics' },
      schoolClass: { name: 'Grade 9 Science' },
    };

    vi.mocked(prisma.classSubject.findUnique).mockResolvedValue(existing as any);
    vi.mocked(prisma.classSubject.delete).mockResolvedValue(existing as any);

    const deleted = await AdminConfigService.deleteClassSubject(tenantId, 'cs-1', 'usr-admin-01');
    expect(deleted.id).toBe('cs-1');
    expect(prisma.classSubject.delete).toHaveBeenCalledWith({ where: { id: 'cs-1' } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        userId: 'usr-admin-01',
        action: 'DELETE',
        entityType: 'CLASS_SUBJECT',
      }),
    });
  });
});
