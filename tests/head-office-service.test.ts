import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    tenant: {
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

describe('HeadOfficeService (Phase 1: Head Office Management)', () => {
  const mockTenantId = 'tenant-sch-001';
  const mockUserId = 'usr-admin-01';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.country.count).mockResolvedValue(1);
  });

  describe('ensureDefaultHeadOffice', () => {
    it('should create default head office when count is 0', async () => {
      vi.mocked(prisma.headOffice.count).mockResolvedValue(0);
      vi.mocked(prisma.schoolProfile.findUnique).mockResolvedValue({
        id: 'prof-01',
        tenantId: mockTenantId,
        nameEn: 'Greenwood International School',
        nameUr: 'گرین ووڈ انٹرنیشنل اسکول',
        code: 'SCH-001',
        registrationNo: 'REG-1234',
        logoUrl: null,
        contactEmail: 'info@greenwood.edu.pk',
        contactPhone: '+92 21 34567890',
        addressEn: 'Karachi Campus',
        addressUr: null,
        currencySymbol: 'Rs.',
        currencyCode: 'PKR',
        timezone: 'Asia/Karachi',
        dateFormat: 'DD/MM/YYYY',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const createdObj = {
        id: 'ho-default-01',
        tenantId: mockTenantId,
        name: 'Greenwood International School — Central Head Office',
        code: 'HO-KHI',
        shortName: 'KHI-HO',
        registrationNo: 'REG-1234',
        addressLine1: 'Karachi Campus',
        addressLine2: 'Executive Wing, 4th Floor',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        postalCode: '75400',
        phone: '+92 21 34567890',
        altPhone: '+92 21 34567891',
        email: 'info@greenwood.edu.pk',
        website: 'https://greenwood.edu.pk',
        directorName: 'Prof. Dr. Tariq Mansoor (Director General)',
        adminContact: 'Muhammad Irfan (Secretary Administration)',
        timezone: 'Asia/Karachi',
        currency: 'PKR',
        status: 'ACTIVE',
        remarks: 'Primary Executive Secretariat and central governing office.',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.headOffice.create).mockResolvedValue(createdObj as any);

      const result = await HeadOfficeService.ensureDefaultHeadOffice(mockTenantId, mockUserId);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('HO-KHI');
      expect(prisma.headOffice.create).toHaveBeenCalledTimes(1);
    });

    it('should do nothing if head offices already exist', async () => {
      vi.mocked(prisma.headOffice.count).mockResolvedValue(2);
      const result = await HeadOfficeService.ensureDefaultHeadOffice(mockTenantId);
      expect(result).toBeNull();
      expect(prisma.headOffice.create).not.toHaveBeenCalled();
    });
  });

  describe('getHeadOffices', () => {
    it('should return list of head offices and aggregate stats', async () => {
      vi.mocked(prisma.headOffice.count).mockResolvedValue(2);
      const mockList = [
        {
          id: 'ho-1',
          tenantId: mockTenantId,
          name: 'Karachi Central Head Office',
          code: 'HO-KHI',
          shortName: 'KHI-HO',
          registrationNo: 'REG-001',
          addressLine1: 'Plot 14-C Shahrah-e-Faisal',
          addressLine2: null,
          city: 'Karachi',
          state: 'Sindh',
          country: 'Pakistan',
          postalCode: '75400',
          phone: '+92 21 34567890',
          altPhone: null,
          email: 'headoffice@greenwood.edu.pk',
          website: 'https://greenwood.edu.pk',
          directorName: 'Prof. Dr. Tariq Mansoor',
          adminContact: 'Muhammad Irfan',
          timezone: 'Asia/Karachi',
          currency: 'PKR',
          status: 'ACTIVE',
          remarks: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'ho-2',
          tenantId: mockTenantId,
          name: 'Lahore Regional Head Office',
          code: 'HO-LHR',
          shortName: 'LHR-HO',
          registrationNo: 'REG-002',
          addressLine1: 'Main Boulevard, Gulberg',
          addressLine2: null,
          city: 'Lahore',
          state: 'Punjab',
          country: 'Pakistan',
          postalCode: '54000',
          phone: '+92 42 35789012',
          altPhone: null,
          email: 'lhr.headoffice@greenwood.edu.pk',
          website: null,
          directorName: 'Dr. Salman Qazi',
          adminContact: 'Tariq Mehmood',
          timezone: 'Asia/Karachi',
          currency: 'PKR',
          status: 'ACTIVE',
          remarks: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.headOffice.findMany)
        .mockResolvedValueOnce(mockList as any) // filtered items
        .mockResolvedValueOnce([
          { id: 'ho-1', status: 'ACTIVE', city: 'Karachi' },
          { id: 'ho-2', status: 'ACTIVE', city: 'Lahore' },
        ] as any); // all records for stats

      const result = await HeadOfficeService.getHeadOffices(mockTenantId, { search: 'Karachi' });
      expect(result.items).toHaveLength(2);
      expect(result.stats.total).toBe(2);
      expect(result.stats.active).toBe(2);
      expect(result.stats.inactive).toBe(0);
      expect(result.stats.citiesCount).toBe(2);
    });
  });

  describe('createHeadOffice', () => {
    it('should create head office with uppercase code and valid data', async () => {
      vi.mocked(prisma.headOffice.findUnique).mockResolvedValue(null);

      const input = {
        name: 'Islamabad Federal Head Office',
        code: 'ho-isb',
        shortName: 'isb-ho',
        addressLine1: 'Sector F-8/3, Street 12',
        city: 'Islamabad',
        state: 'ICT',
        country: 'Pakistan',
        phone: '+92 51 2345678',
        email: 'isb@greenwood.edu.pk',
      };

      const createdObj = {
        id: 'ho-3',
        tenantId: mockTenantId,
        name: 'Islamabad Federal Head Office',
        code: 'HO-ISB',
        shortName: 'ISB-HO',
        registrationNo: null,
        addressLine1: 'Sector F-8/3, Street 12',
        addressLine2: null,
        city: 'Islamabad',
        state: 'ICT',
        country: 'Pakistan',
        postalCode: null,
        phone: '+92 51 2345678',
        altPhone: null,
        email: 'isb@greenwood.edu.pk',
        website: null,
        directorName: null,
        adminContact: null,
        timezone: 'Asia/Karachi',
        currency: 'PKR',
        status: 'ACTIVE',
        remarks: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.headOffice.create).mockResolvedValue(createdObj as any);

      const res = await HeadOfficeService.createHeadOffice(mockTenantId, input, mockUserId);
      expect(res.code).toBe('HO-ISB');
      expect(res.shortName).toBe('ISB-HO');
      expect(prisma.headOffice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'HO-ISB',
            name: 'Islamabad Federal Head Office',
          }),
        })
      );
    });

    it('should throw error on missing required fields', async () => {
      await expect(
        HeadOfficeService.createHeadOffice(mockTenantId, {
          name: '',
          code: 'HO-TEST',
          addressLine1: 'Address',
          city: 'Karachi',
        })
      ).rejects.toThrow('Head Office Name is required.');

      await expect(
        HeadOfficeService.createHeadOffice(mockTenantId, {
          name: 'Test Office',
          code: '',
          addressLine1: 'Address',
          city: 'Karachi',
        })
      ).rejects.toThrow('Head Office Code is required.');
    });

    it('should throw error if head office code already exists in tenant', async () => {
      vi.mocked(prisma.headOffice.findUnique).mockResolvedValue({
        id: 'ho-existing',
        tenantId: mockTenantId,
        code: 'HO-KHI',
      } as any);

      await expect(
        HeadOfficeService.createHeadOffice(mockTenantId, {
          name: 'Duplicate Office',
          code: 'HO-KHI',
          addressLine1: 'Address',
          city: 'Karachi',
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('updateHeadOffice', () => {
    it('should update head office details successfully', async () => {
      const existing = {
        id: 'ho-1',
        tenantId: mockTenantId,
        name: 'Old Name',
        code: 'HO-01',
        addressLine1: 'Old Address',
        city: 'Karachi',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.headOffice.findFirst).mockResolvedValue(existing as any);
      vi.mocked(prisma.headOffice.findUnique).mockResolvedValue(null);

      const updated = {
        ...existing,
        name: 'New Name Updated',
      };
      vi.mocked(prisma.headOffice.update).mockResolvedValue(updated as any);

      const res = await HeadOfficeService.updateHeadOffice(
        mockTenantId,
        'ho-1',
        { name: 'New Name Updated' },
        mockUserId
      );

      expect(res.name).toBe('New Name Updated');
      expect(prisma.headOffice.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggleHeadOfficeStatus', () => {
    it('should safely toggle status from ACTIVE to INACTIVE with audit reason', async () => {
      const existing = {
        id: 'ho-1',
        tenantId: mockTenantId,
        name: 'Karachi Central Head Office',
        code: 'HO-KHI',
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
        'Office under renovation',
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

  describe('getHeadOfficeAuditLogs', () => {
    it('should return audit trail for head office', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          tenantId: mockTenantId,
          entityType: 'HEAD_OFFICE',
          entityId: 'ho-1',
          action: 'CREATE',
          changeSummary: 'Created Head Office',
          userId: mockUserId,
          timestamp: new Date(),
        },
      ];

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as any);

      const logs = await HeadOfficeService.getHeadOfficeAuditLogs(mockTenantId, 'ho-1');
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('CREATE');
    });
  });
});

