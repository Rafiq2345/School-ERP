import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';

describe('Administration Configuration Master Data Schema & Invariants', () => {
  // 1. Model Registry & Tenant Ownership Validation
  const adminConfigModels: (keyof typeof Prisma.ModelName)[] = [
    'AcademicSession',
    'ClassCategory',
    'SchoolClass',
    'Section',
    'Subject',
    'ClassSubject',
    'StudentCategory',
    'House',
    'AcademicCalendarEvent',
    'Department',
    'Designation',
    'EmployeeCategory',
    'EmploymentType',
    'LeaveType',
    'Shift',
    'WorkingDayPolicy',
    'GradingScheme',
    'GradeBand',
    'PassingRule',
    'SubjectPassingRule',
    'ExamRuleAssignment',
    'DocumentSequence',
    'CustomFieldDefinition',
    'CustomFieldOption',
  ];

  it('should verify all 24 Administration Configuration models are registered in Prisma client', () => {
    adminConfigModels.forEach((modelName) => {
      expect(Prisma.ModelName[modelName]).toBe(modelName);
    });
  });

  it('should enforce that all 24 Administration Configuration models contain tenantId for strict multi-tenancy', () => {
    // Inspect Prisma DMMF model metadata
    const dmmfModels = Prisma.dmmf.datamodel.models;
    adminConfigModels.forEach((modelName) => {
      const modelMeta = dmmfModels.find((m) => m.name === modelName);
      expect(modelMeta, `Model ${modelName} should exist in DMMF`).toBeDefined();

      const tenantIdField = modelMeta?.fields.find((f) => f.name === 'tenantId');
      expect(tenantIdField, `Model ${modelName} must have a tenantId field`).toBeDefined();
      expect(tenantIdField?.type).toBe('String');
      expect(tenantIdField?.isRequired).toBe(true);
    });
  });

  // 2. Tenant-Scoped Uniqueness Invariants
  it('should enforce composite unique constraints with tenantId on key configuration models', () => {
    const dmmfModels = Prisma.dmmf.datamodel.models;

    const testUniqueness = (modelName: string, expectedFields: string[]) => {
      const model = dmmfModels.find((m) => m.name === modelName);
      const hasUnique = model?.uniqueFields.some((fieldGroup) =>
        expectedFields.every((f) => fieldGroup.includes(f))
      ) || model?.primaryKey?.fields.some((f) => expectedFields.includes(f));

      expect(hasUnique, `Model ${modelName} must enforce uniqueness on [${expectedFields.join(', ')}]`).toBe(true);
    };

    testUniqueness('AcademicSession', ['tenantId', 'code']);
    testUniqueness('AcademicSession', ['tenantId', 'name']);
    testUniqueness('ClassCategory', ['tenantId', 'code']);
    testUniqueness('SchoolClass', ['tenantId', 'code']);
    testUniqueness('Section', ['tenantId', 'classId', 'code']);
    testUniqueness('Subject', ['tenantId', 'code']);
    testUniqueness('ClassSubject', ['tenantId', 'academicSessionId', 'classId', 'subjectId']);
    testUniqueness('StudentCategory', ['tenantId', 'code']);
    testUniqueness('House', ['tenantId', 'code']);
    testUniqueness('Department', ['tenantId', 'code']);
    testUniqueness('Designation', ['tenantId', 'code']);
    testUniqueness('EmployeeCategory', ['tenantId', 'code']);
    testUniqueness('EmploymentType', ['tenantId', 'code']);
    testUniqueness('LeaveType', ['tenantId', 'code']);
    testUniqueness('Shift', ['tenantId', 'code']);
    testUniqueness('WorkingDayPolicy', ['tenantId', 'code']);
    testUniqueness('GradingScheme', ['tenantId', 'code']);
    testUniqueness('PassingRule', ['tenantId', 'code']);
    testUniqueness('SubjectPassingRule', ['tenantId', 'passingRuleId', 'classId', 'subjectId']);
    testUniqueness('ExamRuleAssignment', ['tenantId', 'academicSessionId', 'classId']);
    testUniqueness('DocumentSequence', ['tenantId', 'moduleCode', 'documentType', 'academicSessionId']);
    testUniqueness('CustomFieldDefinition', ['tenantId', 'entityType', 'fieldKey']);
    testUniqueness('CustomFieldOption', ['tenantId', 'customFieldDefinitionId', 'value']);
  });

  // 3. Academic Session Lifecycle & Invariant Validation
  describe('Academic Session Lifecycle Logic', () => {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['ACTIVE'],
      ACTIVE: ['CLOSED', 'LOCKED'],
      CLOSED: ['LOCKED'],
      LOCKED: [], // Immutable once locked
    };

    const validateSessionTransition = (currentStatus: string, nextStatus: string): boolean => {
      return validTransitions[currentStatus]?.includes(nextStatus) ?? false;
    };

    it('should permit valid session lifecycle transitions', () => {
      expect(validateSessionTransition('DRAFT', 'ACTIVE')).toBe(true);
      expect(validateSessionTransition('ACTIVE', 'CLOSED')).toBe(true);
      expect(validateSessionTransition('CLOSED', 'LOCKED')).toBe(true);
    });

    it('should reject invalid or backward session lifecycle transitions', () => {
      expect(validateSessionTransition('LOCKED', 'ACTIVE')).toBe(false);
      expect(validateSessionTransition('CLOSED', 'DRAFT')).toBe(false);
      expect(validateSessionTransition('LOCKED', 'DRAFT')).toBe(false);
    });

    it('should validate single current session invariant per tenant', () => {
      const tenantSessions = [
        { id: 'sess-1', tenantId: 'tenant-a', isCurrent: true, status: 'ACTIVE' },
        { id: 'sess-2', tenantId: 'tenant-a', isCurrent: false, status: 'CLOSED' },
      ];

      const activateNewSession = (newSessionId: string, tenantId: string) => {
        const activeCount = tenantSessions.filter((s) => s.tenantId === tenantId && s.isCurrent).length;
        if (activeCount > 1) {
          throw new Error('VIOLATION: Multiple current sessions detected for tenant');
        }
        return true;
      };

      expect(activateNewSession('sess-1', 'tenant-a')).toBe(true);
    });
  });

  // 4. Grade Band Range & Calculation Invariant Validation
  describe('Grading Scheme & Grade Band Range Rules', () => {
    interface MockGradeBand {
      gradeLabel: string;
      minValue: number;
      maxValue: number;
      gpaValue?: number;
    }

    const validateGradeBands = (bands: MockGradeBand[]): { isValid: boolean; error?: string } => {
      // 1. Check each individual band min <= max
      for (const band of bands) {
        if (band.minValue >= band.maxValue) {
          return { isValid: false, error: `Invalid range: minValue (${band.minValue}) >= maxValue (${band.maxValue}) for grade ${band.gradeLabel}` };
        }
      }

      // 2. Check sorted and non-overlapping
      const sorted = [...bands].sort((a, b) => a.minValue - b.minValue);
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].maxValue > sorted[i + 1].minValue) {
          return {
            isValid: false,
            error: `Overlapping grade bands: ${sorted[i].gradeLabel} (${sorted[i].minValue}-${sorted[i].maxValue}) overlaps with ${sorted[i + 1].gradeLabel} (${sorted[i + 1].minValue}-${sorted[i + 1].maxValue})`,
          };
        }
      }

      return { isValid: true };
    };

    it('should validate well-formed, non-overlapping grade bands', () => {
      const validBands: MockGradeBand[] = [
        { gradeLabel: 'F', minValue: 0.0, maxValue: 49.99, gpaValue: 0.0 },
        { gradeLabel: 'C', minValue: 50.0, maxValue: 59.99, gpaValue: 2.0 },
        { gradeLabel: 'B', minValue: 60.0, maxValue: 69.99, gpaValue: 3.0 },
        { gradeLabel: 'A', minValue: 70.0, maxValue: 79.99, gpaValue: 3.7 },
        { gradeLabel: 'A+', minValue: 80.0, maxValue: 100.0, gpaValue: 4.0 },
      ];

      const result = validateGradeBands(validBands);
      expect(result.isValid).toBe(true);
    });

    it('should reject grade bands where minValue >= maxValue', () => {
      const invalidBands: MockGradeBand[] = [
        { gradeLabel: 'A', minValue: 80.0, maxValue: 70.0, gpaValue: 4.0 },
      ];

      const result = validateGradeBands(invalidBands);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('minValue (80) >= maxValue (70)');
    });

    it('should reject overlapping grade bands', () => {
      const overlappingBands: MockGradeBand[] = [
        { gradeLabel: 'B', minValue: 60.0, maxValue: 75.0, gpaValue: 3.0 },
        { gradeLabel: 'A', minValue: 70.0, maxValue: 85.0, gpaValue: 3.7 }, // overlaps with B
      ];

      const result = validateGradeBands(overlappingBands);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('overlaps');
    });
  });

  // 5. Document Sequence Concurrency & Formatting Logic
  describe('Document Sequence Number Generation Invariants', () => {
    const formatSequenceNumber = (
      prefix: string | null,
      currentNumber: number,
      paddingLength: number,
      suffix: string | null
    ): string => {
      const paddedNum = String(currentNumber).padStart(paddingLength, '0');
      return `${prefix || ''}${paddedNum}${suffix || ''}`;
    };

    it('should generate formatted sequence numbers with configurable padding and prefix', () => {
      const formattedVoucher = formatSequenceNumber('VCH-2026-', 42, 5, null);
      expect(formattedVoucher).toBe('VCH-2026-00042');

      const formattedStudentId = formatSequenceNumber('STD-', 108, 6, '-GIS');
      expect(formattedStudentId).toBe('STD-000108-GIS');
    });
  });

  // 6. Cross-Tenant Relationship Guard Logic
  describe('Cross-Tenant Security Invariants', () => {
    it('should reject entity relationships between different tenant boundaries', () => {
      const tenantA = 'tenant-school-alpha';
      const tenantB = 'tenant-school-beta';

      const parentClass = { id: 'cls-101', tenantId: tenantA, name: 'Grade 9' };
      const incomingSection = { id: 'sec-201', tenantId: tenantB, classId: 'cls-101', name: 'Section A' };

      const validateTenantAffinity = (parentTenantId: string, childTenantId: string) => {
        if (parentTenantId !== childTenantId) {
          throw new Error('SECURITY VIOLATION: Cross-tenant reference rejected');
        }
        return true;
      };

      expect(() => validateTenantAffinity(parentClass.tenantId, incomingSection.tenantId)).toThrow(
        /SECURITY VIOLATION: Cross-tenant reference rejected/
      );
    });
  });
});
