import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlobalReferenceService } from '../src/lib/services/global-reference-service';
import { HeadOfficeService } from '../src/lib/services/head-office-service';
import { prisma } from '../src/lib/db/prisma';

vi.mock('../src/lib/db/prisma', () => {
  const mockPrisma = {
    headOffice: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    schoolProfile: {
      findUnique: vi.fn(),
    },
    country: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    stateProvince: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    city: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    globalTimezone: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    globalCurrency: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    employee: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };

  return { prisma: mockPrisma };
});

describe('GlobalReferenceService — Master Data & Validations', () => {
  describe('normalizePhoneNumber', () => {
    it('should return null for empty or undefined phone numbers', () => {
      expect(GlobalReferenceService.normalizePhoneNumber('')).toEqual({ normalized: null, isValid: true });
      expect(GlobalReferenceService.normalizePhoneNumber(null)).toEqual({ normalized: null, isValid: true });
      expect(GlobalReferenceService.normalizePhoneNumber(undefined)).toEqual({ normalized: null, isValid: true });
    });

    it('should normalize local zero-prefixed numbers using calling code', () => {
      const res = GlobalReferenceService.normalizePhoneNumber('0300 1234567', '+92');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+92 3001234567');
    });

    it('should handle hyphenated and parenthesized numbers with country code', () => {
      const res = GlobalReferenceService.normalizePhoneNumber('+92 (21) 3456-7890', '+92');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+92 2134567890');
    });

    it('should handle UK numbers with +44 prefix', () => {
      const res = GlobalReferenceService.normalizePhoneNumber('020 7946 0991', '+44');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+44 2079460991');
    });

    it('should reject phone numbers that are too short', () => {
      const res = GlobalReferenceService.normalizePhoneNumber('123');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('too short');
    });

    it('should reject phone numbers exceeding 15 digits', () => {
      const res = GlobalReferenceService.normalizePhoneNumber('123456789012345678');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('maximum length');
    });
  });

  describe('validateEmail', () => {
    it('should allow valid standard emails', () => {
      expect(GlobalReferenceService.validateEmail('admin@greenwood.com')).toEqual({ isValid: true });
    });

    it('should allow multi-level international & educational domains', () => {
      expect(GlobalReferenceService.validateEmail('info@greenwood.edu.pk')).toEqual({ isValid: true });
      expect(GlobalReferenceService.validateEmail('head.office@domain.co.uk')).toEqual({ isValid: true });
      expect(GlobalReferenceService.validateEmail('contact@unesco.org')).toEqual({ isValid: true });
      expect(GlobalReferenceService.validateEmail('director@school.sa')).toEqual({ isValid: true });
    });

    it('should reject invalid emails', () => {
      expect(GlobalReferenceService.validateEmail('not-an-email').isValid).toBe(false);
      expect(GlobalReferenceService.validateEmail('missingdomain@').isValid).toBe(false);
      expect(GlobalReferenceService.validateEmail('@nodomain.com').isValid).toBe(false);
      expect(GlobalReferenceService.validateEmail('user@domain').isValid).toBe(false);
    });

    it('should allow empty email if optional', () => {
      expect(GlobalReferenceService.validateEmail('')).toEqual({ isValid: true });
      expect(GlobalReferenceService.validateEmail(null)).toEqual({ isValid: true });
    });
  });

  describe('validateWebsite', () => {
    it('should validate and preserve https URLs', () => {
      const res = GlobalReferenceService.validateWebsite('https://greenwood.edu.pk');
      expect(res.isValid).toBe(true);
      expect(res.normalizedUrl).toBe('https://greenwood.edu.pk');
    });

    it('should auto-prepend https:// if omitted', () => {
      const res = GlobalReferenceService.validateWebsite('greenwood.edu.pk/about');
      expect(res.isValid).toBe(true);
      expect(res.normalizedUrl).toBe('https://greenwood.edu.pk/about');
    });

    it('should reject invalid website formats without domain', () => {
      const res = GlobalReferenceService.validateWebsite('invalid-web');
      expect(res.isValid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('should allow empty website when optional', () => {
      expect(GlobalReferenceService.validateWebsite('')).toEqual({ isValid: true, normalizedUrl: null });
      expect(GlobalReferenceService.validateWebsite(null)).toEqual({ isValid: true, normalizedUrl: null });
    });
  });
});

describe('HeadOfficeService — Relational Reference Integration', () => {
  const mockTenantId = 'tenant-sch-001';
  const mockUserId = 'usr-admin-01';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateHeadOfficeCode', () => {
    it('should generate next sequential code formatted as HO-CITY-001', async () => {
      vi.mocked(prisma.headOffice.findMany).mockResolvedValueOnce([]);

      const code1 = await HeadOfficeService.generateHeadOfficeCode(mockTenantId, 'KHI');
      expect(code1).toBe('HO-KHI-001');

      vi.mocked(prisma.headOffice.findMany).mockResolvedValueOnce([
        { code: 'HO-KHI-001' } as any,
        { code: 'HO-KHI-002' } as any,
      ]);

      const code3 = await HeadOfficeService.generateHeadOfficeCode(mockTenantId, 'Karachi');
      expect(code3).toBe('HO-KAR-003');
    });

    it('should fallback to HQ prefix when city code is empty', async () => {
      vi.mocked(prisma.headOffice.findMany).mockResolvedValueOnce([]);
      const code = await HeadOfficeService.generateHeadOfficeCode(mockTenantId, '');
      expect(code).toBe('HO-HQ-001');
    });
  });

  describe('getActiveEmployeesForLookup', () => {
    it('should query active HR employees with department and designation', async () => {
      const mockEmps = [
        {
          id: 'emp-1',
          employeeNo: 'EMP-101',
          firstNameEn: 'Tariq',
          lastNameEn: 'Mansoor',
          phone: '+923001234567',
          email: 'tariq@greenwood.edu.pk',
          department: { id: 'd-1', name: 'Executive Secretariat', code: 'EXEC' },
          designation: { id: 'des-1', name: 'Director General', code: 'DG' },
        },
      ];

      vi.mocked(prisma.employee.findMany).mockResolvedValue(mockEmps as any);

      const res = await HeadOfficeService.getActiveEmployeesForLookup(mockTenantId, 'Tariq');
      expect(res).toHaveLength(1);
      expect(res[0].fullName).toBe('Tariq Mansoor');
      expect(res[0].designation).toBe('Director General');
      expect(res[0].department).toBe('Executive Secretariat');
      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            currentStatus: 'ACTIVE',
          }),
        })
      );
    });
  });

  describe('createHeadOffice with Relational References', () => {
    it('should validate cascading references and create Head Office with IDs and snapshot fields', async () => {
      vi.mocked(prisma.country.findUnique).mockResolvedValue({
        id: 'country-pk',
        isoCode: 'PK',
        name: 'Pakistan',
        phoneCallingCode: '+92',
      } as any);

      vi.mocked(prisma.stateProvince.findUnique).mockResolvedValue({
        id: 'state-sd',
        countryId: 'country-pk',
        code: 'SD',
        name: 'Sindh',
      } as any);

      vi.mocked(prisma.city.findUnique).mockResolvedValue({
        id: 'city-khi',
        stateId: 'state-sd',
        code: 'KHI',
        name: 'Karachi',
      } as any);

      vi.mocked(prisma.employee.findFirst).mockResolvedValue({
        id: 'emp-101',
        tenantId: mockTenantId,
        firstNameEn: 'Tariq',
        lastNameEn: 'Mansoor',
        currentStatus: 'ACTIVE',
        designation: { name: 'Director General' },
      } as any);

      vi.mocked(prisma.headOffice.findUnique).mockResolvedValue(null);

      const createdRecord = {
        id: 'ho-pk-01',
        tenantId: mockTenantId,
        name: 'Central Executive Head Office',
        code: 'HO-KHI-001',
        shortName: 'KHI-HO',
        countryId: 'country-pk',
        stateId: 'state-sd',
        cityId: 'city-khi',
        addressLine1: 'Plot 14-C Shahrah-e-Faisal',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        phone: '+92 21 34567890',
        email: 'info@greenwood.edu.pk',
        website: 'https://greenwood.edu.pk',
        directorEmployeeId: 'emp-101',
        directorName: 'Tariq Mansoor (Director General)',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.headOffice.create).mockResolvedValue(createdRecord as any);

      const result = await HeadOfficeService.createHeadOffice(
        mockTenantId,
        {
          name: 'Central Executive Head Office',
          code: 'HO-KHI-001',
          shortName: 'KHI-HO',
          countryId: 'country-pk',
          stateId: 'state-sd',
          cityId: 'city-khi',
          addressLine1: 'Plot 14-C Shahrah-e-Faisal',
          phone: '021 34567890',
          email: 'info@greenwood.edu.pk',
          website: 'greenwood.edu.pk',
          directorEmployeeId: 'emp-101',
        },
        mockUserId
      );

      expect(result.id).toBe('ho-pk-01');
      expect(result.code).toBe('HO-KHI-001');
      expect(prisma.headOffice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            countryId: 'country-pk',
            stateId: 'state-sd',
            cityId: 'city-khi',
            country: 'Pakistan',
            state: 'Sindh',
            city: 'Karachi',
            phone: '+92 2134567890',
            website: 'https://greenwood.edu.pk',
            directorEmployeeId: 'emp-101',
            directorName: 'Tariq Mansoor (Director General)',
          }),
        })
      );
    });

    it('should reject state that does not belong to the selected country', async () => {
      vi.mocked(prisma.country.findUnique).mockResolvedValue({
        id: 'country-pk',
        phoneCallingCode: '+92',
      } as any);

      vi.mocked(prisma.stateProvince.findUnique).mockResolvedValue({
        id: 'state-eng',
        countryId: 'country-uk',
        name: 'England',
      } as any);

      await expect(
        HeadOfficeService.createHeadOffice(mockTenantId, {
          name: 'Invalid Office',
          code: 'HO-INV-001',
          countryId: 'country-pk',
          stateId: 'state-eng',
          addressLine1: 'Test Address',
        })
      ).rejects.toThrow('Selected State/Province does not belong to the selected Country');
    });

    it('should reject city that does not belong to the selected state', async () => {
      vi.mocked(prisma.country.findUnique).mockResolvedValue({
        id: 'country-pk',
        phoneCallingCode: '+92',
      } as any);

      vi.mocked(prisma.stateProvince.findUnique).mockResolvedValue({
        id: 'state-sd',
        countryId: 'country-pk',
        name: 'Sindh',
      } as any);

      vi.mocked(prisma.city.findUnique).mockResolvedValue({
        id: 'city-lhr',
        stateId: 'state-pb',
        name: 'Lahore',
      } as any);

      await expect(
        HeadOfficeService.createHeadOffice(mockTenantId, {
          name: 'Invalid Office',
          code: 'HO-INV-002',
          countryId: 'country-pk',
          stateId: 'state-sd',
          cityId: 'city-lhr',
          addressLine1: 'Test Address',
        })
      ).rejects.toThrow('Selected City does not belong to the selected State/Province');
    });

    it('should reject director selection if employee is inactive or not found', async () => {
      vi.mocked(prisma.country.findUnique).mockResolvedValue({
        id: 'country-pk',
        name: 'Pakistan',
        phoneCallingCode: '+92',
      } as any);

      vi.mocked(prisma.employee.findFirst).mockResolvedValue(null);

      await expect(
        HeadOfficeService.createHeadOffice(mockTenantId, {
          name: 'Invalid Director Office',
          code: 'HO-INV-003',
          countryId: 'country-pk',
          city: 'Karachi',
          addressLine1: 'Test Address',
          directorEmployeeId: 'emp-inactive',
        })
      ).rejects.toThrow('Selected Director must be an active employee in HR');
    });
  });

  describe('updateHeadOffice and toggleStatus', () => {
    it('should update head office and preserve or update relational references', async () => {
      const existing = {
        id: 'ho-1',
        tenantId: mockTenantId,
        name: 'Karachi Office',
        code: 'HO-KHI-001',
        city: 'Karachi',
        addressLine1: 'Old Address',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.headOffice.update).mockResolvedValue({
        ...existing,
        name: 'Karachi Central Office Updated',
      } as any);

      const res = await HeadOfficeService.updateHeadOffice(
        mockTenantId,
        'ho-1',
        { name: 'Karachi Central Office Updated' },
        mockUserId
      );

      expect(res.name).toBe('Karachi Central Office Updated');
      expect(prisma.headOffice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ho-1' },
          data: expect.objectContaining({
            name: 'Karachi Central Office Updated',
          }),
        })
      );
    });

    it('should toggle status and record audit log with reason', async () => {
      const existing = {
        id: 'ho-1',
        tenantId: mockTenantId,
        name: 'Karachi Office',
        code: 'HO-KHI-001',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.headOffice.update).mockResolvedValue({
        ...existing,
        status: 'INACTIVE',
      } as any);

      const res = await HeadOfficeService.toggleHeadOfficeStatus(
        mockTenantId,
        'ho-1',
        'INACTIVE',
        'Branch consolidation',
        mockUserId
      );

      expect(res.status).toBe('INACTIVE');
      expect(prisma.headOffice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ho-1' },
          data: { status: 'INACTIVE' },
        })
      );
    });
  });
});
